//+------------------------------------------------------------------+
//| ProfitPulseSync.mq5                                              |
//| ProfitPulse trade sync EA                                        |
//|                                                                  |
//| Attach to any chart. On first run it backfills your closed-trade |
//| history to your ProfitPulse pulse, then posts every trade as it  |
//| closes. Re-posting is always safe: the server deduplicates by    |
//| MT5 position id, so missed syncs (terminal closed overnight etc.)|
//| are caught up automatically on the next scan.                    |
//|                                                                  |
//| Setup:                                                           |
//|  1. Tools > Options > Expert Advisors > "Allow WebRequest for    |
//|     listed URL" — add your ProfitPulse domain.                   |
//|  2. Attach this EA to any chart, paste your API key (generated   |
//|     in ProfitPulse > your pulse > Connect MT5).                  |
//|  3. Keep "Algo Trading" enabled. Done.                           |
//+------------------------------------------------------------------+
#property copyright "ProfitPulse"
#property link      "https://profitpulse.qzz.io"
#property version   "1.00"
#property strict

input string ApiKey            = "";                        // ProfitPulse API key (pp_live_...)
input string ServerUrl         = "https://profitpulse.qzz.io"; // ProfitPulse server URL
input int    BrokerGmtOffset   = 0;                         // Broker server GMT offset (hours)
input int    BackfillDays      = 180;                       // History to backfill on first run (days)
input int    SyncIntervalSec   = 60;                        // Sync scan interval (seconds)
input bool   WarnOnRiskBreach  = true;                      // Alert when a new position breaches limits

// Overlap re-scanned before the cursor on every pass. Server dedup makes
// re-posts harmless; the overlap catches deals written with a lagging clock.
#define SCAN_OVERLAP_SEC 86400
#define MAX_TRADES_PER_POST 100
#define WEBREQUEST_TIMEOUT_MS 15000

string   g_cursorVar;          // GlobalVariable name persisting the scan cursor
bool     g_syncPending = false;
datetime g_lastConstraintsAt = 0;

// Cached constraint values for position-open warnings
double g_maxRiskPct     = 0.0;
double g_accountSize    = 0.0;
double g_maxDailyDD     = 0.0;
double g_dailyLossToday = 0.0;
int    g_noTradeDays    = 0;
double g_riskCapPct     = -1.0;  // fraction of maxRiskPct, -1 = no cap
bool   g_locked         = false;

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(ApiKey) < 10)
   {
      Alert("ProfitPulseSync: set your API key in the EA inputs (ProfitPulse > pulse > Connect MT5).");
      return(INIT_PARAMETERS_INCORRECT);
   }

   g_cursorVar = "PP_SYNC_CURSOR_" + (string)AccountInfoInteger(ACCOUNT_LOGIN);

   EventSetTimer(SyncIntervalSec);
   g_syncPending = true;   // first pass = backfill (or catch-up)
   Print("ProfitPulseSync: initialized for account ", AccountInfoInteger(ACCOUNT_LOGIN),
         " — first sync in a few seconds.");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

//+------------------------------------------------------------------+
void OnTimer()
{
   if(g_syncPending)
   {
      g_syncPending = false;
      SyncClosedPositions();
   }
   else
   {
      // Periodic catch-up scan even without a close event this session.
      SyncClosedPositions();
   }
}

//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   if(!HistoryDealSelect(trans.deal)) return;
   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);

   if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
   {
      // A position (partially) closed — sync on the next timer tick so the
      // full deal record is settled in history first.
      g_syncPending = true;
   }
   else if(entry == DEAL_ENTRY_IN && WarnOnRiskBreach)
   {
      CheckRiskOnOpen(trans.deal);
   }
}

//+------------------------------------------------------------------+
//| Closed-position scan + post                                      |
//+------------------------------------------------------------------+
void SyncClosedPositions()
{
   datetime cursor = 0;
   if(GlobalVariableCheck(g_cursorVar))
      cursor = (datetime)(long)GlobalVariableGet(g_cursorVar);

   datetime from = (cursor > 0)
      ? cursor - SCAN_OVERLAP_SEC
      : TimeCurrent() - (datetime)BackfillDays * 86400;
   if(from < 0) from = 0;

   if(!HistorySelect(from, TimeCurrent() + 60))
   {
      Print("ProfitPulseSync: HistorySelect failed");
      return;
   }

   // Collect position ids that have at least one exit deal in the window.
   long posIds[];
   int  posCount = 0;
   int  deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT)
         continue;
      long posId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      if(posId == 0) continue;

      bool seen = false;
      for(int j = 0; j < posCount; j++)
         if(posIds[j] == posId) { seen = true; break; }
      if(!seen)
      {
         ArrayResize(posIds, posCount + 1);
         posIds[posCount++] = posId;
      }
   }

   if(posCount == 0) return;

   // Build one JSON entry per FULLY closed position, chronological by close.
   string  jsonEntries[];
   datetime closeTimes[];
   int     entryCount = 0;
   datetime maxClose = cursor;

   for(int p = 0; p < posCount; p++)
   {
      string entryJson;
      datetime closeTime;
      if(BuildPositionJson(posIds[p], entryJson, closeTime))
      {
         ArrayResize(jsonEntries, entryCount + 1);
         ArrayResize(closeTimes, entryCount + 1);
         jsonEntries[entryCount] = entryJson;
         closeTimes[entryCount]  = closeTime;
         entryCount++;
         if(closeTime > maxClose) maxClose = closeTime;
      }
   }

   if(entryCount == 0) return;

   // Insertion sort by close time (small arrays).
   for(int i = 1; i < entryCount; i++)
   {
      string   je = jsonEntries[i];
      datetime ct = closeTimes[i];
      int j = i - 1;
      while(j >= 0 && closeTimes[j] > ct)
      {
         jsonEntries[j + 1] = jsonEntries[j];
         closeTimes[j + 1]  = closeTimes[j];
         j--;
      }
      jsonEntries[j + 1] = je;
      closeTimes[j + 1]  = ct;
   }

   // Post in chronological chunks.
   int posted = 0;
   while(posted < entryCount)
   {
      int chunk = MathMin(MAX_TRADES_PER_POST, entryCount - posted);
      string payload = "{\"accountNumber\":\"" + (string)AccountInfoInteger(ACCOUNT_LOGIN) + "\"," +
                       "\"gmtOffsetHours\":" + (string)BrokerGmtOffset + "," +
                       "\"trades\":[";
      for(int i = 0; i < chunk; i++)
      {
         if(i > 0) payload += ",";
         payload += jsonEntries[posted + i];
      }
      payload += "]}";

      if(!PostJson("/api/ea/trades", payload))
      {
         // Leave the cursor untouched — the next scan re-sends this window.
         Print("ProfitPulseSync: post failed, will retry on next scan.");
         return;
      }
      posted += chunk;
   }

   GlobalVariableSet(g_cursorVar, (double)(long)maxClose);
   Print("ProfitPulseSync: synced ", entryCount, " closed position(s).");
}

//+------------------------------------------------------------------+
//| Aggregate a position's deals into one trade JSON entry.          |
//| Returns false while the position is still (partially) open.      |
//+------------------------------------------------------------------+
bool BuildPositionJson(const long posId, string &json, datetime &closeTime)
{
   if(!HistorySelectByPosition(posId)) return(false);

   double inLots = 0, outLots = 0;
   double inValue = 0, outValue = 0;          // volume-weighted price sums
   double profit = 0, commission = 0, swap = 0;
   double sl = 0, tp = 0;
   long   dealType = -1;
   string symbol = "";
   datetime openTime = 0;
   closeTime = 0;

   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      double lots  = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);

      profit     += HistoryDealGetDouble(ticket, DEAL_PROFIT);
      commission += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      swap       += HistoryDealGetDouble(ticket, DEAL_SWAP);

      if(entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_INOUT)
      {
         if(entry == DEAL_ENTRY_IN)
         {
            inLots  += lots;
            inValue += lots * price;
         }
         if(dealType < 0) dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
         if(symbol == "") symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
         datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         if(openTime == 0 || t < openTime) openTime = t;
      }
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
      {
         outLots  += lots;
         outValue += lots * price;
         datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         if(t > closeTime) closeTime = t;
         double dealSl = HistoryDealGetDouble(ticket, DEAL_SL);
         double dealTp = HistoryDealGetDouble(ticket, DEAL_TP);
         if(dealSl > 0) sl = dealSl;
         if(dealTp > 0) tp = dealTp;
      }
   }

   // Still open (or hedged remainder) — post it once it fully closes.
   if(inLots <= 0 || outLots + 0.0000001 < inLots) return(false);

   double openPrice  = (inLots  > 0) ? inValue  / inLots  : 0;
   double closePrice = (outLots > 0) ? outValue / outLots : 0;
   string type = (dealType == DEAL_TYPE_SELL) ? "sell" : "buy";

   json = "{\"positionId\":\"" + (string)posId + "\"," +
          "\"symbol\":\""  + JsonEscape(symbol) + "\"," +
          "\"type\":\""    + type + "\"," +
          "\"lots\":"      + DoubleToString(inLots, 2) + "," +
          "\"openTime\":"  + (string)(long)openTime + "," +
          "\"closeTime\":" + (string)(long)closeTime + "," +
          "\"openPrice\":" + DoubleToString(openPrice, 8) + "," +
          "\"closePrice\":"+ DoubleToString(closePrice, 8) + "," +
          "\"sl\":"        + DoubleToString(sl, 8) + "," +
          "\"tp\":"        + DoubleToString(tp, 8) + "," +
          "\"commission\":"+ DoubleToString(commission, 2) + "," +
          "\"swap\":"      + DoubleToString(swap, 2) + "," +
          "\"profit\":"    + DoubleToString(profit, 2) + "}";
   return(true);
}

//+------------------------------------------------------------------+
//| Risk warning on new position (FTMO-Mentor-style, alert only)     |
//+------------------------------------------------------------------+
void CheckRiskOnOpen(const ulong dealTicket)
{
   RefreshConstraints();
   if(g_accountSize <= 0) return;

   if(g_locked)
   {
      Alert("ProfitPulse: this pulse is LOCKED (total drawdown breached). This trade will be recorded, not blocked.");
      return;
   }
   if(g_noTradeDays > 0)
   {
      Alert("ProfitPulse: today is a mandated NO-TRADE day (", g_noTradeDays,
            " remaining). This trade will be logged as a violation.");
   }

   long posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   if(posId == 0 || !PositionSelectByTicket(posId)) return;

   string symbol = PositionGetString(POSITION_SYMBOL);
   double lots   = PositionGetDouble(POSITION_VOLUME);
   double price  = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl     = PositionGetDouble(POSITION_SL);
   if(sl <= 0)
   {
      Alert("ProfitPulse: position on ", symbol, " has NO STOP LOSS — risk is unbounded.");
      return;
   }

   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tickSize <= 0 || tickValue <= 0) return;

   double riskMoney = MathAbs(price - sl) / tickSize * tickValue * lots;
   double riskPct   = riskMoney / g_accountSize * 100.0;

   double effectiveLimit = g_maxRiskPct;
   if(g_riskCapPct > 0) effectiveLimit = g_maxRiskPct * g_riskCapPct;

   if(effectiveLimit > 0 && riskPct > effectiveLimit)
   {
      Alert("ProfitPulse: RISK BREACH — ", DoubleToString(riskPct, 2),
            "% at stake on ", symbol, " vs your ", DoubleToString(effectiveLimit, 2),
            "% limit", (g_riskCapPct > 0 ? " (risk cap active)" : ""),
            ". Reduce size or tighten the stop.");
   }

   if(g_maxDailyDD > 0)
   {
      double ddLimitMoney = g_maxDailyDD / 100.0 * g_accountSize;
      if(g_dailyLossToday + riskMoney >= ddLimitMoney)
         Alert("ProfitPulse: this position's risk would hit your daily drawdown limit (",
               DoubleToString(g_maxDailyDD, 2), "% = $", DoubleToString(ddLimitMoney, 0), ").");
   }
}

void RefreshConstraints()
{
   // Cache for 60s — one poll per position open, not per tick.
   if(TimeCurrent() - g_lastConstraintsAt < 60 && g_accountSize > 0) return;

   string response;
   if(!GetJson("/api/ea/constraints", response)) return;
   g_lastConstraintsAt = TimeCurrent();

   g_accountSize    = JsonNumber(response, "accountSize");
   g_maxRiskPct     = JsonNumber(response, "maxRiskPerTrade");
   g_maxDailyDD     = JsonNumber(response, "maxDailyDrawdown");
   g_dailyLossToday = JsonNumber(response, "dailyLossToday");
   g_noTradeDays    = (int)JsonNumber(response, "noTradeDays");
   g_locked         = (StringFind(response, "\"locked\":true") >= 0);
   double cap       = JsonNumber(response, "riskCapPct");
   g_riskCapPct     = (cap > 0) ? cap : -1.0;
}

//+------------------------------------------------------------------+
//| HTTP + JSON helpers                                              |
//+------------------------------------------------------------------+
bool PostJson(const string path, const string payload)
{
   char post[], result[];
   string resultHeaders;
   StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);

   string headers = "Content-Type: application/json\r\nX-API-Key: " + ApiKey + "\r\n";
   ResetLastError();
   int status = WebRequest("POST", ServerUrl + path, headers,
                           WEBREQUEST_TIMEOUT_MS, post, result, resultHeaders);
   if(status == -1)
   {
      Print("ProfitPulseSync: WebRequest error ", GetLastError(),
            " — is '", ServerUrl, "' in Tools > Options > Expert Advisors > allowed URLs?");
      return(false);
   }
   if(status == 401)
   {
      Alert("ProfitPulseSync: API key rejected — generate a new key in ProfitPulse and update the EA input.");
      return(false);
   }
   if(status < 200 || status >= 300)
   {
      Print("ProfitPulseSync: server responded ", status, ": ",
            CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
      return(false);
   }
   return(true);
}

bool GetJson(const string path, string &response)
{
   char post[], result[];
   string resultHeaders;
   string headers = "X-API-Key: " + ApiKey + "\r\n";
   ResetLastError();
   int status = WebRequest("GET", ServerUrl + path, headers,
                           WEBREQUEST_TIMEOUT_MS, post, result, resultHeaders);
   if(status < 200 || status >= 300) return(false);
   response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   return(true);
}

double JsonNumber(const string json, const string key)
{
   int k = StringFind(json, "\"" + key + "\":");
   if(k < 0) return(0);
   int start = k + StringLen(key) + 3;
   int end = start;
   int len = StringLen(json);
   while(end < len)
   {
      ushort c = StringGetCharacter(json, end);
      if((c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+' || c == 'e' || c == 'E')
         end++;
      else
         break;
   }
   if(end == start) return(0);
   return(StringToDouble(StringSubstr(json, start, end - start)));
}

string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return(s);
}
//+------------------------------------------------------------------+

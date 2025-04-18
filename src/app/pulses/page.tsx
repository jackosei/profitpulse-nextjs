"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserPulses } from "@/services/firestore";
import type { Pulse } from "@/types/pulse";
import Loader from "@/components/ui/Loader";
import PulsesTable from "@/components/dashboard/PulsesTable";
import CreatePulseModal from "@/components/modals/CreatePulseModal";

export default function PulsesPage() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchPulses = useCallback(async () => {
    if (!user) return;
    try {
      const userPulses = await getUserPulses(user.uid);
      setPulses(userPulses);
    } catch (error) {
      console.error("Error fetching pulses:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPulses();
  }, [fetchPulses]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trading Pulses</h1>
      </div>
      
      <div className="bg-dark rounded-lg border border-gray-800">
        <PulsesTable
          pulses={pulses}
          onCreatePulse={() => setShowCreateModal(true)}
        />
      </div>

      <CreatePulseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchPulses}
      />
    </div>
  );
} 
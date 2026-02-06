"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Pulse } from "@/types/pulse";
import Loader from "@/components/ui/Loader";
import PulsesTable from "@/components/dashboard/PulsesTable";
import CreatePulseModal from "@/components/modals/CreatePulseModal";
import { usePulse } from "@/hooks/usePulse";

export default function PulsesPage() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    getUserPulses, 
    loading: pulseLoading, 
    error: pulseError 
  } = usePulse({
    onError: (message) => {
      console.error("Error:", message);
    }
  });

  useEffect(() => {
    async function fetchPulses() {
      if (!user) return;
      
      const fetchedPulses = await getUserPulses(user.uid);
      if (fetchedPulses) {
        setPulses(fetchedPulses);
      }
    }
    
    fetchPulses();
  }, [user, getUserPulses]);

  if (pulseLoading && pulses.length === 0) {
    return <Loader />;
  }

  if (pulseError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Error loading pulses: {pulseError}</p>
      </div>
    );
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
        onSuccess={async () => {
          const updatedPulses = await getUserPulses(user!.uid);
          if (updatedPulses) {
            setPulses(updatedPulses);
          }
        }}
      />
    </div>
  );
} 
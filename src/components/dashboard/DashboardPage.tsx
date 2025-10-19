import React, { useState } from "react";
import FlashcardGenerator from "./FlashcardGenerator";
import FlashcardReviewer from "./FlashcardReviewer";
import EditCardDialog from "./EditCardDialog";
import type {
  FlashcardCandidateDTO,
  GenerateFlashcardsRequestDTO,
  GenerateFlashcardsResponseDTO,
  ApiErrorResponseDTO,
  CreateFlashcardRequestDTO,
  CreateGenerationLogRequestDTO,
} from "@/types";
import { toast } from "sonner";

type ViewMode = "generator" | "review";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("generator");
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<FlashcardCandidateDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<FlashcardCandidateDTO | null>(null);

  const handleGenerateSubmit = async (source_text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: GenerateFlashcardsRequestDTO = { source_text };

      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponseDTO = await response.json();
        throw new Error(errorData.error.message || "Wystąpił nieznany błąd API.");
      }

      const data: GenerateFlashcardsResponseDTO = await response.json();

      if (data.candidates.length === 0) {
        toast.info("AI nie znalazło żadnych propozycji fiszek dla tego tekstu.", {
          description: "Spróbuj z innym fragmentem tekstu lub zmodyfikuj obecny.",
        });
        setViewMode("generator");
      } else {
        setCandidates(data.candidates);
        setViewMode("review");
        toast.success(`Wygenerowano ${data.candidates.length} propozycji fiszek!`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      setError(errorMessage);
      toast.error("Błąd podczas generowania fiszek", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeCandidate = (candidate: FlashcardCandidateDTO) => {
    setCandidates((prev) => prev.filter((c) => c.front !== candidate.front || c.back !== candidate.back));
  };

  const handleAccept = async (candidate: FlashcardCandidateDTO) => {
    try {
      const requestBody: CreateFlashcardRequestDTO = {
        front: candidate.front,
        back: candidate.back,
        generation_metadata: {
          original_front: candidate.front,
          original_back: candidate.back,
        },
      };
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData: ApiErrorResponseDTO = await response.json();
        throw new Error(errorData.error.message || "Błąd przy akceptowaniu fiszki.");
      }
      toast.success("Fiszka została zaakceptowana i dodana do Twojej kolekcji.");
      removeCandidate(candidate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      toast.error("Nie udało się zaakceptować fiszki", { description: errorMessage });
    }
  };

  const handleEdit = (candidate: FlashcardCandidateDTO) => {
    setCandidateToEdit(candidate);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedCard = (editedCandidate: FlashcardCandidateDTO) => {
    if (!candidateToEdit) return;
    
    // Update the candidate in the list without removing it
    setCandidates((prev) =>
      prev.map((c) =>
        c.front === candidateToEdit.front && c.back === candidateToEdit.back
          ? editedCandidate
          : c
      )
    );
    
    toast.success("Zmiany zostały zapisane. Możesz edytować ponownie lub zaakceptować fiszkę.");
  };

  const handleSaveAndAcceptEditedCard = async (editedCandidate: FlashcardCandidateDTO) => {
    if (!candidateToEdit) return;
    try {
      const requestBody: CreateFlashcardRequestDTO = {
        front: editedCandidate.front,
        back: editedCandidate.back,
        generation_metadata: {
          original_front: candidateToEdit.front,
          original_back: candidateToEdit.back,
        },
      };
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponseDTO = await response.json();
        throw new Error(errorData.error.message || "Błąd przy zapisywaniu edytowanej fiszki.");
      }
      toast.success("Zmiany zostały zapisane, a fiszka dodana do kolekcji.");
      removeCandidate(candidateToEdit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      toast.error("Nie udało się zapisać zmian", { description: errorMessage });
    } finally {
      setIsEditDialogOpen(false);
      setCandidateToEdit(null);
    }
  };

  const handleReject = async (candidate: FlashcardCandidateDTO) => {
    try {
      const requestBody: CreateGenerationLogRequestDTO = {
        status: "rejected",
        original_front: candidate.front,
        original_back: candidate.back,
      };
      const response = await fetch("/api/generation-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData: ApiErrorResponseDTO = await response.json();
        throw new Error(errorData.error.message || "Błąd przy odrzucaniu fiszki.");
      }
      toast.info("Propozycja fiszki została odrzucona.");
      removeCandidate(candidate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      toast.error("Nie udało się odrzucić fiszki", { description: errorMessage });
    }
  };

  const handleComplete = () => {
    setViewMode("generator");
    setCandidates([]);
  };

  const handleAcceptAll = async () => {
    if (candidates.length === 0) return;
    
    try {
      // Accept all candidates in parallel
      const promises = candidates.map(async (candidate) => {
        const requestBody: CreateFlashcardRequestDTO = {
          front: candidate.front,
          back: candidate.back,
          generation_metadata: {
            original_front: candidate.front,
            original_back: candidate.back,
          },
        };
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
          const errorData: ApiErrorResponseDTO = await response.json();
          throw new Error(errorData.error.message || "Błąd przy akceptowaniu fiszki.");
        }
      });

      await Promise.all(promises);
      
      toast.success(`Wszystkie ${candidates.length} fiszek zostały zaakceptowane i dodane do kolekcji.`);
      setCandidates([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      toast.error("Nie udało się zaakceptować wszystkich fiszek", { description: errorMessage });
    }
  };

  const handleRejectAll = async () => {
    if (candidates.length === 0) return;
    
    try {
      // Reject all candidates in parallel
      const promises = candidates.map(async (candidate) => {
        const requestBody: CreateGenerationLogRequestDTO = {
          status: "rejected",
          original_front: candidate.front,
          original_back: candidate.back,
        };
        const response = await fetch("/api/generation-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
          const errorData: ApiErrorResponseDTO = await response.json();
          throw new Error(errorData.error.message || "Błąd przy odrzucaniu fiszki.");
        }
      });

      await Promise.all(promises);
      
      toast.info(`Wszystkie ${candidates.length} propozycji zostały odrzucone.`);
      setCandidates([]);
      // Return to generator to create new set
      setViewMode("generator");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.";
      toast.error("Nie udało się odrzucić wszystkich fiszek", { description: errorMessage });
    }
  };

  const MainContent = () => {
    if (viewMode === "review") {
      return (
        <FlashcardReviewer
          candidates={candidates}
          onAccept={handleAccept}
          onEdit={handleEdit}
          onReject={handleReject}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onComplete={handleComplete}
        />
      );
    }

    return <FlashcardGenerator isLoading={isLoading} onSubmit={handleGenerateSubmit} />;
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <MainContent />
      <EditCardDialog
        isOpen={isEditDialogOpen}
        candidateToEdit={candidateToEdit}
        onSave={handleSaveEditedCard}
        onSaveAndAccept={handleSaveAndAcceptEditedCard}
        onClose={() => {
          setIsEditDialogOpen(false);
          setCandidateToEdit(null);
        }}
      />
    </div>
  );
}

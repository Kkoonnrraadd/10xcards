import React from "react";
import type { FlashcardCandidateDTO } from "@/types";
import ReviewCard from "./ReviewCard";
import { Button } from "@/components/ui/button";

interface FlashcardReviewerProps {
  candidates: FlashcardCandidateDTO[];
  onAccept: (candidate: FlashcardCandidateDTO) => void;
  onEdit: (candidate: FlashcardCandidateDTO) => void;
  onReject: (candidate: FlashcardCandidateDTO) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onComplete: () => void;
}

export default function FlashcardReviewer({
  candidates,
  onAccept,
  onEdit,
  onReject,
  onAcceptAll,
  onRejectAll,
  onComplete,
}: FlashcardReviewerProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-center space-y-4 rounded-lg border-2 border-dashed border-muted bg-muted/40 p-12" data-testid="review-complete">
        <h2 className="text-2xl font-bold">Recenzja zakończona!</h2>
        <p className="text-muted-foreground">Wszystkie wygenerowane propozycje zostały przetworzone.</p>
        <Button onClick={onComplete} data-testid="generate-more-button">Generuj kolejne fiszki</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="flashcard-reviewer">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold" data-testid="reviewer-heading">Przegląd propozycji fiszek</h1>
        <p className="text-muted-foreground">
          Przejrzyj propozycje wygenerowane przez AI. Możesz je zaakceptować, edytować lub odrzucić.
        </p>
        <div className="flex gap-3 pt-2">
          <Button onClick={onAcceptAll} variant="default" className="flex-1" data-testid="accept-all-button">
            Zaakceptuj wszystkie ({candidates.length})
          </Button>
          <Button onClick={onRejectAll} variant="outline" className="flex-1" data-testid="reject-all-button">
            Odrzuć wszystkie
          </Button>
        </div>
      </div>
      <div className="space-y-4" data-testid="candidates-list">
        {candidates.map((candidate, index) => (
          <ReviewCard
            key={index}
            candidate={candidate}
            onAccept={() => onAccept(candidate)}
            onEdit={() => onEdit(candidate)}
            onReject={() => onReject(candidate)}
          />
        ))}
      </div>
    </div>
  );
}

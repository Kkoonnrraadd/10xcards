import React from "react";
import type { FlashcardCandidateDTO } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Trash2 } from "lucide-react";

interface ReviewCardProps {
  candidate: FlashcardCandidateDTO;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

export default function ReviewCard({ candidate, onAccept, onEdit, onReject }: ReviewCardProps) {
  return (
    <Card className="transition-all hover:shadow-md" data-testid="review-card">
      <CardHeader>
        <CardTitle>Propozycja fiszki</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Przód</p>
          <p className="font-semibold text-lg" data-testid="card-front">
            {candidate.front}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Tył</p>
          <p className="text-base" data-testid="card-back">
            {candidate.back}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 bg-muted/50 p-4 rounded-b-lg">
        <Button variant="outline" size="icon" onClick={onReject} aria-label="Odrzuć" data-testid="reject-card-button">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onEdit} aria-label="Edytuj" data-testid="edit-card-button">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={onAccept} aria-label="Akceptuj" data-testid="accept-card-button">
          <Check className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

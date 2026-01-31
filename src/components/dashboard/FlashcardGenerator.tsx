import React, { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const MIN_LENGTH = 1000;
const MAX_LENGTH = 10000;

interface FlashcardGeneratorProps {
  isLoading: boolean;
  onSubmit: (text: string) => void;
}

export default function FlashcardGenerator({ isLoading, onSubmit }: FlashcardGeneratorProps) {
  const [sourceText, setSourceText] = useState("");

  const isValid = useMemo(() => sourceText.length >= MIN_LENGTH && sourceText.length <= MAX_LENGTH, [sourceText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onSubmit(sourceText);
    }
  };

  return (
    <div className="space-y-4" data-testid="flashcard-generator">
      <h1 className="text-3xl font-bold" data-testid="generator-heading">
        Generator Fiszki
      </h1>
      <p className="text-muted-foreground">
        Wklej tekst (od {MIN_LENGTH} do {MAX_LENGTH} znaków), aby wygenerować fiszki przy użyciu AI.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Wklej tutaj swój tekst..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="min-h-[300px] pr-20"
            disabled={isLoading}
            data-testid="source-text-input"
          />
          <div className="absolute bottom-3 right-3 text-sm text-muted-foreground" data-testid="character-counter">
            {sourceText.length} / {MAX_LENGTH}
          </div>
        </div>

        {!isValid && sourceText.length > 0 && (
          <Alert variant="destructive" data-testid="text-length-error">
            <AlertTitle>Nieprawidłowa długość tekstu</AlertTitle>
            <AlertDescription>
              Tekst musi mieć od {MIN_LENGTH} do {MAX_LENGTH} znaków.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2" data-testid="generation-progress">
            <p className="text-sm text-center">Analizowanie tekstu i generowanie fiszek...</p>
            <Progress value={undefined} />
          </div>
        )}

        <Button type="submit" disabled={!isValid || isLoading} className="w-full" data-testid="generate-button">
          {isLoading ? "Generowanie..." : "Generuj"}
        </Button>
      </form>
    </div>
  );
}

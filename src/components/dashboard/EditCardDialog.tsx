import React, { useState, useEffect, useMemo } from "react";
import type { FlashcardCandidateDTO } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

interface EditCardDialogProps {
  isOpen: boolean;
  candidateToEdit: FlashcardCandidateDTO | null;
  onSave: (editedCandidate: FlashcardCandidateDTO) => void;
  onSaveAndAccept: (editedCandidate: FlashcardCandidateDTO) => void;
  onClose: () => void;
}

export default function EditCardDialog({
  isOpen,
  candidateToEdit,
  onSave,
  onSaveAndAccept,
  onClose,
}: EditCardDialogProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    if (candidateToEdit) {
      setFront(candidateToEdit.front);
      setBack(candidateToEdit.back);
    }
  }, [candidateToEdit]);

  const isFrontValid = useMemo(() => front.trim().length > 0 && front.length <= MAX_FRONT_LENGTH, [front]);
  const isBackValid = useMemo(() => back.trim().length > 0 && back.length <= MAX_BACK_LENGTH, [back]);
  const isFormValid = isFrontValid && isBackValid;

  const handleSave = () => {
    if (isFormValid && candidateToEdit) {
      onSave({ front, back });
      onClose();
    }
  };

  const handleSaveAndAccept = () => {
    if (isFormValid && candidateToEdit) {
      onSaveAndAccept({ front, back });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj propozycję fiszki</DialogTitle>
          <DialogDescription>
            Wprowadź zmiany w treści fiszki i zapisz, aby ją zaakceptować.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="front" className="text-right">
              Przód
            </label>
            <div className="col-span-3">
              <Input
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                className={!isFrontValid && front.length > 0 ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {front.length}/{MAX_FRONT_LENGTH}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="back" className="text-right">
              Tył
            </label>
            <div className="col-span-3">
                <Textarea
                    id="back"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className={!isBackValid && back.length > 0 ? "border-red-500" : ""}
                />
                 <p className="text-xs text-muted-foreground mt-1 text-right">
                    {back.length}/{MAX_BACK_LENGTH}
                </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
          <Button type="button" variant="secondary" onClick={handleSave} disabled={!isFormValid}>
            Zapisz
          </Button>
          <Button type="submit" onClick={handleSaveAndAccept} disabled={!isFormValid}>
            Zapisz i akceptuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

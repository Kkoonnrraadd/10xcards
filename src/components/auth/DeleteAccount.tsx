import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CONFIRMATION_TEXT = "USUŃ";

export default function DeleteAccount() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmationValid) return;

    setIsLoading(true);

    try {
      // TODO: Implement Supabase auth integration
      // Call Edge Function or API endpoint to delete user account
      // const { error } = await supabase.functions.invoke('delete-user');
      
      // if (error) throw error;
      
      // Sign out and redirect to home
      // await supabase.auth.signOut();
      // window.location.href = "/";
      
      toast.success("Konto zostało usunięte", {
        description: "Twoje konto i wszystkie powiązane dane zostały trwale usunięte.",
      });

      // eslint-disable-next-line no-console
      console.log("Account deleted successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas usuwania konta.";
      toast.error("Nie udało się usunąć konta", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setConfirmationText("");
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Strefa niebezpieczna</CardTitle>
          <CardDescription>
            Nieodwracalne działania związane z Twoim kontem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Uwaga</AlertTitle>
            <AlertDescription>
              Usunięcie konta jest nieodwracalne. Wszystkie Twoje fiszki, kolekcje i dane zostaną trwale usunięte.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={() => setIsDialogOpen(true)}
            className="w-full"
          >
            Usuń konto
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć konto?</DialogTitle>
            <DialogDescription>
              Ta akcja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte z naszych serwerów.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>To spowoduje trwałe usunięcie:</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Twojego konta użytkownika</li>
                  <li>Wszystkich Twoich fiszek</li>
                  <li>Wszystkich kolekcji</li>
                  <li>Historii generowania</li>
                  <li>Wszystkich innych powiązanych danych</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Aby potwierdzić, wpisz <span className="font-bold">{CONFIRMATION_TEXT}</span>
              </Label>
              <Input
                id="confirmation"
                type="text"
                placeholder={CONFIRMATION_TEXT}
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setConfirmationText("");
              }}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmationValid || isLoading}
            >
              {isLoading ? "Usuwanie..." : "Usuń konto na zawsze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


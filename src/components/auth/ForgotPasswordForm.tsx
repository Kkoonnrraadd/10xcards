import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation
    if (!email) {
      setError("Proszę podać adres e-mail.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Proszę podać prawidłowy adres e-mail.");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement Supabase auth integration
      // const { error } = await supabase.auth.resetPasswordForEmail(email, {
      //   redirectTo: `${window.location.origin}/update-password`,
      // });
      
      // if (error) throw error;

      setSuccess(true);
      // eslint-disable-next-line no-console
      console.log("Password reset request for:", email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas wysyłania instrukcji.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="size-6 text-green-600 dark:text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Sprawdź swoją skrzynkę</h1>
          <p className="text-muted-foreground">
            Wysłaliśmy instrukcje resetowania hasła na adres:
          </p>
          <p className="font-medium">{email}</p>
        </div>

        <Alert>
          <AlertTitle>Co dalej?</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Otwórz wiadomość e-mail od 10xCards</li>
              <li>Kliknij w link resetowania hasła</li>
              <li>Ustaw nowe hasło</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button asChild variant="outline" className="w-full">
            <a href="/login">
              <ArrowLeft />
              Powrót do logowania
            </a>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nie otrzymałeś wiadomości?{" "}
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="text-primary hover:underline font-medium"
            >
              Spróbuj ponownie
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Zapomniałeś hasła?</h1>
        <p className="text-muted-foreground">
          Podaj swój adres e-mail, a wyślemy Ci instrukcje resetowania hasła
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            aria-invalid={error ? "true" : "false"}
            autoComplete="email"
            autoFocus
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Błąd</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Wysyłanie..." : "Wyślij instrukcje"}
        </Button>
      </form>

      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <a href="/login">
            <ArrowLeft />
            Powrót do logowania
          </a>
        </Button>
      </div>
    </div>
  );
}


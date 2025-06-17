'use client'; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-headline font-bold text-destructive mb-2">Oops! Something went wrong.</h1>
      <p className="text-lg text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. We're sorry for the inconvenience.
        You can try to refresh the page or go back to the home page.
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Error details: {error.message}
      </p>
      <div className="flex gap-4">
        <Button
          onClick={() => reset()}
          variant="destructive"
          size="lg"
        >
          Try Again
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          variant="outline"
          size="lg"
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}

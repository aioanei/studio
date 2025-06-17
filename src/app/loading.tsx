import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-xl text-muted-foreground">Loading The Hot Seat...</p>
    </div>
  );
}

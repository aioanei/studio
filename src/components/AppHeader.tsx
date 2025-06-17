import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-headline font-bold">
          <Flame className="w-8 h-8 text-accent-foreground" />
          The Hot Seat
        </Link>
        {/* Navigation items can be added here if needed */}
      </div>
    </header>
  );
}

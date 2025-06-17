export default function AppFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} The Hot Seat. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          Built with Next.js, Tailwind CSS, and Genkit.
        </p>
      </div>
    </footer>
  );
}

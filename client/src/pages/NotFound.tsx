import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
      <p className="text-6xl">💇‍♀️</p>
      <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
      <p className="text-gray-500">This page doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary mt-2">
        Back to Home
      </Link>
    </main>
  );
}

import Quiz from './components/Quiz';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">Quiz : Vos Habitudes Écologiques</h1>
        <Quiz />
      </div>
    </main>
  );
} 
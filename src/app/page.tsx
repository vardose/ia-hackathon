import Quiz from './components/Quiz';
import { FaLeaf, FaRecycle } from 'react-icons/fa';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 py-12 relative overflow-hidden">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-100 rounded-full opacity-30 blur-xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-100 rounded-full opacity-30 blur-xl -ml-20 -mb-20"></div>
      
      {/* Images de plantes en SVG ou en éléments décoratifs */}
      <div className="absolute left-4 top-1/4 text-green-700 opacity-20 transform scale-150">
        <FaLeaf size={120} />
      </div>
      <div className="absolute right-4 top-2/3 text-green-600 opacity-20 transform scale-150">
        <FaLeaf size={90} />
      </div>
      <div className="absolute left-1/4 bottom-8 text-teal-600 opacity-20 transform -rotate-12 scale-150">
        <FaRecycle size={100} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center mb-8">
          <FaLeaf className="text-green-600 mr-3 text-3xl" />
          <h1 className="text-4xl font-bold text-center text-green-800 font-eco">Quiz : Vos Habitudes Écologiques</h1>
          <FaLeaf className="text-green-600 ml-3 text-3xl transform scale-x-[-1]" />
        </div>
        
        <p className="text-center text-green-700 mb-10 max-w-2xl mx-auto">
          Découvrez l'impact de vos actions quotidiennes sur notre planète et comment vous pouvez contribuer à un avenir plus durable.
        </p>
        
        <Quiz />
      </div>
    </main>
  );
}
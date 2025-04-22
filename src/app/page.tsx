import Quiz from './components/Quiz';
import { FaAppleAlt, FaCarrot, FaRecycle } from 'react-icons/fa';
import { GiWheat, GiSlicedBread } from 'react-icons/gi';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-12 relative overflow-hidden">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100 rounded-full opacity-30 blur-xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-100 rounded-full opacity-30 blur-xl -ml-20 -mb-20"></div>
      
      {/* Images d'aliments en SVG ou en éléments décoratifs */}
      <div className="absolute left-4 top-1/4 text-amber-700 opacity-20 transform scale-150">
        <FaAppleAlt size={120} />
      </div>
      <div className="absolute right-4 top-2/3 text-orange-600 opacity-20 transform scale-150">
        <GiWheat size={90} />
      </div>
      <div className="absolute left-1/4 bottom-8 text-yellow-600 opacity-20 transform -rotate-12 scale-150">
        <FaCarrot size={100} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center mb-8">
          <FaCarrot className="text-orange-600 mr-3 text-3xl" />
          <h1 className="text-4xl font-bold text-center text-amber-800 font-eco">Quiz : Anti-Gaspillage Alimentaire</h1>
          <FaAppleAlt className="text-orange-600 ml-3 text-3xl" />
        </div>
        
        <p className="text-center text-amber-700 mb-10 max-w-2xl mx-auto">
          Découvrez l'impact de vos habitudes de consommation alimentaire et comment vous pouvez contribuer à réduire le gaspillage.
        </p>
        
        <Quiz />
      </div>
    </main>
  );
}
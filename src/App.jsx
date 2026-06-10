import { useState } from "react";
import { BookOpen, Camera, Film } from "lucide-react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/.netlify/functions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "An unknown error occurred.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 flex flex-col h-full">
      <div className="flex items-center mb-4">
        {icon}
        <h2 className="text-xl font-semibold ml-3 text-cyan-300">{title}</h2>
      </div>
      <div className="text-gray-300 flex-grow">{children}</div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <header className="text-center my-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            AI Study Helper <span className="text-cyan-400">📚</span>
          </h1>
          <p className="text-gray-400">
            Your personal AI tutor, powered by Google Gemini.
          </p>
        </header>

        <form
          onSubmit={handleAsk}
          className="w-full max-w-2xl sticky top-4 z-10 p-2 bg-gray-900/50 backdrop-blur-md rounded-full border border-gray-700"
        >
          <div className="flex items-center">
            <input
              className="flex-grow bg-transparent p-3 pl-5 text-lg placeholder-gray-500 focus:outline-none"
              placeholder="What concept do you want to learn?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              aria-label="Ask your question"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-cyan-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed"
              aria-live="polite"
            >
              {loading ? "Generating..." : "Ask"}
            </button>
          </div>
        </form>
        
        <main className="w-full mt-10">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
              <p>
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {loading && (
              <>
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
              </>
            )}
            
            {result && (
              <>
                <ResultCard
                  icon={<BookOpen className="text-cyan-400" size={24} />}
                  title="Definition"
                >
                  <p className="leading-relaxed">{result.definition}</p>
                </ResultCard>

                <ResultCard
                  icon={<Camera className="text-cyan-400" size={24} />}
                  title="Diagram"
                >
                  <img
                    src={result.diagramDataUrl}
                    alt={`Diagram of ${question}`}
                    className="rounded-lg w-full h-auto object-contain mt-2 border border-gray-700"
                  />
                </ResultCard>

                <ResultCard
                  icon={<Film className="text-cyan-400" size={24} />}
                  title="Animation Idea"
                >
                  <p className="leading-relaxed">{result.animationDescription}</p>
                </ResultCard>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

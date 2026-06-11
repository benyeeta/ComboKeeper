export default function LandingPage() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center mt-12 text-center px-4">
      <h1 className="text-5xl font-extrabold mb-6 text-gray-900 dark:text-white tracking-tight">
        Combo<span className="text-pink-500">Keeper</span>
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl leading-relaxed">
        The ultimate tactical dashboard for competitive osu! players and teams.
      </p>

      <a
        href="/api/auth/login"
        className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform hover:scale-105 shadow-lg shadow-pink-600/20 mb-16 relative z-10"
      >
        Login with osu! to get started
      </a>

      <div className="w-full max-w-5xl relative group mb-20 pointer-events-none select-none hidden sm:block">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white dark:bg-[#161415] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:-translate-y-2">
          <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2 bg-gray-50 dark:bg-[#1a171a]">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <div className="flex-1 flex justify-center">
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
            <div className="flex flex-col gap-4">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" style={{ animationDelay: `${i * 150}ms` }}></div>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="h-5 w-24 bg-pink-500/20 rounded"></div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 dark:bg-[#1a171a] border border-gray-100 dark:border-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-pink-500/10 flex items-center justify-center">
                      <div className="w-4 h-4 bg-pink-500/40 rounded-sm"></div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-3 w-40 sm:w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-2 w-24 sm:w-32 bg-gray-200 dark:bg-gray-800 rounded opacity-60"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-12 text-left">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-start">
          <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-lg mb-4 text-pink-600 dark:text-pink-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">For Players & Teams</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Automate your practice tracking. Upload your local <code className="text-pink-500">scores.db</code> or import MP links to instantly see where your team stands.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-start">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mb-4 text-blue-600 dark:text-blue-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Tactical Analytics</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Discover your team&apos;s Fortress, Achilles&apos; Heel, and optimal Mixed Mod lineups. Make data-driven picks and bans during your matches.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-start">
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mb-4 text-green-600 dark:text-green-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Not a Hosting Tool</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">ComboKeeper is built strictly for competitors to gain an edge. We track personal and team performance, we don&apos;t host the actual tournaments.</p>
        </div>
      </div>
    </div>
  );
}

import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateNovel from './pages/CreateNovel';
import Workspace from './pages/Workspace';
import ChapterEditor from './pages/ChapterEditor';
import Reader from './pages/Reader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './utils/toast';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <div className="min-h-screen bg-antique-paper text-ink-black font-sans selection:bg-jade-green selection:text-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateNovel />} />
            <Route path="/workspace/:id" element={<Workspace />} />
            <Route path="/chapter/:id" element={<ChapterEditor />} />
            <Route path="/reader/:id" element={<Reader />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

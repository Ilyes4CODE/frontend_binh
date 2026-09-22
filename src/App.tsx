import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireClubLevel, RequireSuperAdmin } from '@/components/RequireSuperAdmin'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Toaster } from '@/components/ui/sonner'

import Home from '@/pages/public/Home'
import Register from '@/pages/public/Register'
import Confirmation from '@/pages/public/Confirmation'
import About from '@/pages/public/About'
import Community from '@/pages/public/Community'
import PostDetail from '@/pages/public/PostDetail'
import AdminLogin from '@/pages/admin/Login'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminRegistrations from '@/pages/admin/Registrations'
import AdminRegistrationDetail from '@/pages/admin/RegistrationDetail'
import AdminDocumentFields from '@/pages/admin/DocumentFields'
import AdminSettings from '@/pages/admin/Settings'
import AdminCompetitions from '@/pages/admin/Competitions'
import AdminCompetitionDetail from '@/pages/admin/CompetitionDetail'
import MatchScoring from '@/pages/admin/MatchScoring'
import AdminClubs from '@/pages/admin/Clubs'
import AdminUsers from '@/pages/admin/Users'
import AdminGroups from '@/pages/admin/Groups'
import AdminGallery from '@/pages/admin/Gallery'
import AdminCommunity from '@/pages/admin/Community'
import AdminBranches from '@/pages/admin/Branches'
import AdminActivity from '@/pages/admin/Activity'
import Display from '@/pages/public/Display'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="register" element={<Register />} />
              <Route path="register/:reference" element={<Confirmation />} />
              <Route path="about" element={<About />} />
              <Route path="community" element={<Community />} />
              <Route path="community/:slug" element={<PostDetail />} />
            </Route>

            <Route path="display/:id" element={<Display />} />

            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin" element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="registrations" element={<AdminRegistrations />} />
                <Route path="registrations/:id" element={<AdminRegistrationDetail />} />
                {/* every level: scoped to what the account may see */}
                <Route path="groups" element={<AdminGroups />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="settings" element={<AdminSettings />} />
                {/* club level: national admin and presidents, not branch managers */}
                <Route element={<RequireClubLevel />}>
                  <Route path="branches" element={<AdminBranches />} />
                  <Route path="community" element={<AdminCommunity />} />
                  <Route path="gallery" element={<AdminGallery />} />
                  <Route path="competitions" element={<AdminCompetitions />} />
                  <Route path="competitions/:id" element={<AdminCompetitionDetail />} />
                  <Route path="matches/:id" element={<MatchScoring />} />
                </Route>
                {/* national screens: the national administrator only */}
                <Route element={<RequireSuperAdmin />}>
                  <Route path="clubs" element={<AdminClubs />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="document-fields" element={<AdminDocumentFields />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

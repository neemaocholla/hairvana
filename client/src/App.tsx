import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useOnlineStatus } from './hooks/useOnlineStatus.tsx';
import OfflineBanner from './components/OfflineBanner.tsx';

// ── Lazy-loaded route components ──────────────────────────────────────────────
// Each route is its own chunk so the initial bundle stays small.
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home.tsx'));
const HairstyleGallery = lazy(() => import('./pages/HairstyleGallery.tsx'));
const HairstyleDetail = lazy(() => import('./pages/HairstyleDetail.tsx'));
const StylistList = lazy(() => import('./pages/StylistList.tsx'));
const StylistProfile = lazy(() => import('./pages/StylistProfile.tsx'));
const VendorList = lazy(() => import('./pages/VendorList.tsx'));
const VendorProfile = lazy(() => import('./pages/VendorProfile.tsx'));
const BookingFlow = lazy(() => import('./pages/BookingFlow.tsx'));
const PaymentScreen = lazy(() => import('./pages/PaymentScreen.tsx'));
const MyBookings = lazy(() => import('./pages/MyBookings.tsx'));
const StylistDashboard = lazy(() => import('./pages/StylistDashboard.tsx'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard.tsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const isOnline = useOnlineStatus();

  return (
    <BrowserRouter>
      {!isOnline && <OfflineBanner />}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Client-facing routes */}
          <Route path="/" element={<Home />} />
          <Route path="/hairstyles" element={<HairstyleGallery />} />
          <Route path="/hairstyles/:id" element={<HairstyleDetail />} />
          <Route path="/stylists" element={<StylistList />} />
          <Route path="/stylists/:id" element={<StylistProfile />} />
          <Route path="/vendors" element={<VendorList />} />
          <Route path="/vendors/:id" element={<VendorProfile />} />
          <Route path="/book/:stylistId" element={<BookingFlow />} />
          <Route path="/payments/:bookingId" element={<PaymentScreen />} />
          <Route path="/my-bookings" element={<MyBookings />} />

          {/* Stylist dashboard */}
          <Route path="/stylist/dashboard" element={<StylistDashboard />} />

          {/* Vendor dashboard */}
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />

          {/* Admin dashboard */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

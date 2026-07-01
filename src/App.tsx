import { BrowserRouter } from 'react-router-dom';
import LayoutRoutes from './app/router/LayoutRoutes';
import { AuthProvider } from './app/providers/AuthProvider';
import CartProvider from './app/providers/CartProvider';
import { MembershipProvider } from './app/providers/MembershipProvider';
import BrandingProvider from './app/providers/BrandingProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from './components/ui/sonner';

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <CartProvider>
        <MembershipProvider>
          <BrowserRouter>
            <BrandingProvider>
              <LayoutRoutes />
            </BrandingProvider>
          </BrowserRouter>
        </MembershipProvider>
      </CartProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}

export default App;

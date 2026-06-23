import OverlayLayout from './components/OverlayLayout';
import LandingPage from './components/LandingPage';
import { OBSProvider } from './context/OBSContext';

function App() {
  // The editor/overlay stays at `/` (and every ?room/?obs link is unaffected);
  // the marketing home page lives at `/?home`.
  if (new URLSearchParams(window.location.search).has('home')) {
    return <LandingPage />;
  }
  return (
    <OBSProvider>
      <OverlayLayout />
    </OBSProvider>
  );
}

export default App;

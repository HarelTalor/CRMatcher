import Navbar from '../components/Navbar';

export default function DashboardLayout({ children }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '4.5rem' }}>
        {children}
      </div>
    </>
  );
}

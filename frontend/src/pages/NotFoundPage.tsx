import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="auth-page">
    <div className="card auth-card">
      <h2>পৃষ্ঠা পাওয়া যায়নি</h2>
      <p className="muted">আপনি যে রুটটি চেয়েছেন তা নেই।</p>
      <Link to="/dashboard" className="btn">
        ড্যাশবোর্ডে ফিরে যান
      </Link>
    </div>
  </div>
);

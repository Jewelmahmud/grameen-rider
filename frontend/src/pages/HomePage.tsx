import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const HERO_PHONE_IMAGE =
  'https://images.unsplash.com/photo-1573174713714-d95e436ab8d6?auto=format&fit=crop&w=520&h=980&q=80';

const LogoMark = () => (
  <svg
    className="hm-logo__svg"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <path
      d="M12 3.2v2.1M12 18.6v2.1M3.1 12h2.1M18.6 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.4 1.4M5.4 18.5l1.5-1.4M17.1 6.7l1.4-1.3"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);

const PlayIcon = () => (
  <svg className="hm-btn-icon" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="hm-btn-icon" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.52 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.8.03 3.01 2.65 4.01 2.68 4.01-.02.09-.5 1.7-1.7 3.4zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
    />
  </svg>
);

const StarIcon = () => (
  <svg className="hm-float__star" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3-6.2-4.5h7.6L12 2z" />
  </svg>
);

export const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page landing-page--mint" id="top">
      <header className="landing-header landing-header--mint">
        <div className="landing-container hm-header-inner">
          <a className="hm-logo" href="#top">
            <span className="hm-logo__mark" aria-hidden>
              <LogoMark />
            </span>
            <span className="hm-logo__text">গ্রামীণ রাইড</span>
          </a>

          <nav className="hm-header-nav" aria-label="প্রধান ন্যাভিগেশন">
            <a href="#top" className="is-active">
              হোম
            </a>
            <a href="#features">সম্পর্ক</a>
            <a href="#features">রাইড</a>
            <a href="#drive">ড্রাইভ</a>
          </nav>

          <div className="hm-header-actions">
            <a
              className="hm-btn-playstore"
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PlayIcon />
              গুগল প্লে
            </a>
            {isAuthenticated ? (
              <button type="button" className="btn-cta btn-cta-primary" onClick={() => navigate('/dashboard')}>
                ড্যাশবোর্ড
              </button>
            ) : (
              <>
                <button type="button" className="btn-cta btn-cta-secondary" onClick={() => navigate('/login')}>
                  লগইন
                </button>
                <button type="button" className="btn-cta btn-cta-primary" onClick={() => navigate('/register')}>
                  রেজিস্টার
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hm-hero" aria-labelledby="hm-heading">
        <div className="hm-hero__bg" aria-hidden />
        <div className="hm-hero__inner">
          <p className="hm-hero__kicker">রাইড রিয়েল-টাইম, অপারেশন এক জায়গায়</p>
          <h1 id="hm-heading" className="hm-hero__title">
            রাইড শেয়ারিং-এর ভবিষ্যৎ, আরও স্মার্টে চলুন
          </h1>
          <p className="hm-hero__lead">
            তাৎক্ষণিক বুকিং, রিয়েল-টাইমে ড্রাইভার ট্র্যাক, আর সহজ অপারেশন—সবই এক প্ল্যাটফর্মে; গতি, নিরাপত্তা ও
            স্কেলের জন্য।
          </p>

          <div className="hm-stage" aria-hidden>
            <div className="hm-float hm-float--todo">
              <p className="hm-float__label">করণীয়</p>
              <button type="button" className="hm-float__go">
                যান
              </button>
            </div>

            <div className="hm-float hm-float--users">
              <div className="hm-float__car">🚗</div>
              <div>
                <p className="hm-float__strong">৫ মি.+ ডাউনলোড</p>
                <div className="hm-float__faces">
                  <span className="hm-avatar" style={{ background: '#7dd3c0' }} />
                  <span className="hm-avatar" style={{ background: '#94a3b8' }} />
                  <span className="hm-avatar" style={{ background: '#a78bfa' }} />
                  <span className="hm-avatar hm-avatar--plus">+</span>
                </div>
              </div>
            </div>

            <div className="hm-float hm-float--star">
              <StarIcon />
            </div>

            <div className="hm-float hm-float--interview">
              <div className="hm-float__faces">
                <span className="hm-avatar" style={{ background: '#4ade80' }} />
                <span className="hm-avatar" style={{ background: '#38bdf8' }} />
              </div>
              <span>লাইভ সাপোর্ট</span>
            </div>

            <div className="hm-float hm-float--stores">
              <a className="hm-dl-btn hm-dl-btn--play" href="https://play.google.com" target="_blank" rel="noreferrer">
                <PlayIcon />
                <span>Play স্টোর</span>
              </a>
              <a className="hm-dl-btn hm-dl-btn--apple" href="https://www.apple.com/app-store" target="_blank" rel="noreferrer">
                <AppleIcon />
                <span>অ্যাপ স্টোর</span>
              </a>
            </div>

            <figure className="hm-phone-image-wrap">
              <img
                src={HERO_PHONE_IMAGE}
                alt="রাইড শেয়ারিং অ্যাপ খোলা মোবাইল স্ক্রিন"
                className="hm-phone-image"
                loading="lazy"
              />
            </figure>
          </div>
        </div>
      </section>

      <div id="drive" className="hm-drive-anchor" />

      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-head">
            <h2 className="section-title">কেন টিমগুলো গ্রামীণ রাইড বেছে নেয়</h2>
            <p className="section-lead muted">
              স্কেল মাথায় রেখে তৈরি: যাত্রী পায় পরিষ্কার অভিজ্ঞতা, ড্রাইভার পায় প্রসঙ্গভিত্তিক ডিসপ্যাচ, আর
              অপারেশন টিম পায় প্রয়োজনীয় টুল।
            </p>
          </div>
          <div className="section-grid">
            <article className="card feature-card">
              <div className="feature-card__icon" aria-hidden>
                01
              </div>
              <h3>দ্রুত পিকআপ</h3>
              <p className="muted">লাইভ এভেইলেবিলিটি দেখে কাছের ড্রাইভারের সাথে দ্রুত ম্যাচ করা হয়।</p>
            </article>
            <article className="card feature-card">
              <div className="feature-card__icon" aria-hidden>
                02
              </div>
              <h3>স্বচ্ছ ভাড়া</h3>
              <p className="muted">যাত্রা শুরু করার আগে ট্রিপ ও পেমেন্ট তথ্য পরিষ্কারভাবে দেখা যায়।</p>
            </article>
            <article className="card feature-card">
              <div className="feature-card__icon" aria-hidden>
                03
              </div>
              <h3>মাল্টি-রোল প্ল্যাটফর্ম</h3>
              <p className="muted">অ্যাডমিন, অপারেশন, ব্রাঞ্চ লিড, যাত্রী ও ড্রাইভার - সবার জন্য এক সিস্টেম।</p>
            </article>
          </div>
        </div>
      </section>

      <section id="safety" className="landing-section landing-section--band">
        <div className="landing-container split-section">
          <div className="split-section__text">
            <h2 className="section-title">ডিজাইনেই নিরাপত্তা ও নির্ভরযোগ্যতা</h2>
            <p className="section-lead muted">
              প্রতিটি অনুরোধ স্ট্যাটাস আপডেটসহ ট্র্যাক করা হয়। রোল-ভিত্তিক এক্সেস অভ্যন্তরীণ টুলকে পাবলিক API
              থেকে আলাদা রাখে।
            </p>
            <p className="section-lead muted" style={{ marginTop: '1rem' }}>
              ড্রাইভার হিসেবে যোগ দিতে{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate('/register')}
              >
                রেজিস্টার
              </button>{' '}
              করুন।
            </p>
          </div>
          <div className="card card--border-strong">
            <h3>অপারেশনাল হাইলাইটস</h3>
            <ul className="feature-list">
              <li>ড্রাইভারের প্রোফাইল কেন্দ্রীয় অথ সার্ভিসের সাথে সিঙ্ক থাকে</li>
              <li>রাইড অনুরোধ থেকে সমাপ্তি পর্যন্ত পরিষ্কারভাবে এগোয়</li>
              <li>নোটিফিকেশন ও পেমেন্ট একই সার্ভিস লেয়ারের মাধ্যমে পরিচালিত হয়</li>
            </ul>
          </div>
        </div>
      </section>

      <footer id="support" className="landing-footer">
        <div className="landing-container footer-grid">
          <div className="footer-brand-block">
            <div className="header-brand">
              <span className="brand-dot" aria-hidden />
              <span className="header-brand-text">গ্রামীণ রাইড</span>
            </div>
            <p className="footer-tagline">শহর, যাত্রী ও ড্রাইভারের জন্য নির্ভরযোগ্য যাতায়াত সেবা।</p>
          </div>
          <div className="footer-col">
            <h4>কোম্পানি</h4>
            <a href="#features">আমাদের সম্পর্কে</a>
            <a href="#safety">নিরাপত্তা</a>
          </div>
          <div className="footer-col">
            <h4>সহায়তা</h4>
            <a href="#support">হেল্প</a>
            <a href="#features">রাইড বুক</a>
          </div>
          <div className="footer-col">
            <h4>যোগাযোগ</h4>
            <a href="mailto:support@grameenride.com">support@grameenride.com</a>
            <a href="tel:+8800000000000">+880 0000-000000</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="landing-container footer-legal">
            <span>© {new Date().getFullYear()} গ্রামীণ রাইড। সর্বস্বত্ব সংরক্ষিত।</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

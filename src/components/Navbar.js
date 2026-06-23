import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout } from '../lib/actions/authActions';
import logo from '../assets/icon.png';

const LANGS = [
  { code: 'fr', fi: 'fr' },
  { code: 'en', fi: 'gb' },
  { code: 'ar', fi: 'sa' },
];

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const langRef = useRef(null);

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setLangOpen(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  const currentLang = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  return (
    <nav className="navbar" dir="ltr">
      <div className="navbar-inner">

        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Salat Janaza" className="navbar-logo" />
          <span>Salat Janaza</span>
        </Link>

        {/* Nav links — desktop */}
        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <Link to="/prieres" onClick={() => setMenuOpen(false)}>{t('nav.prayers')}</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>{t('nav.contact')}</Link>
          <Link to="/soutenez-nous" className="navbar-donate" onClick={() => setMenuOpen(false)}>
            {t('nav.support')}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/tableau-de-bord/declarer" onClick={() => setMenuOpen(false)}>{t('nav.declare')}</Link>
              <Link to="/tableau-de-bord" onClick={() => setMenuOpen(false)}>{t('nav.account')}</Link>
              <button className="btn btn-outline-white" onClick={handleLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="btn btn-outline-white" onClick={() => setMenuOpen(false)}>{t('nav.login')}</Link>
              <Link to="/inscription" className="btn btn-white" onClick={() => setMenuOpen(false)}>{t('nav.register')}</Link>
            </>
          )}
        </div>

        {/* Language selector */}
        <div className="lang-selector" ref={langRef}>
          <button className="lang-trigger" onClick={() => setLangOpen((o) => !o)} aria-label="Langue">
            <span className={`fi fi-${currentLang.fi}`} />
            <span className="lang-caret">▾</span>
          </button>
          {langOpen && (
            <div className="lang-dropdown">
              {LANGS.map(({ code, fi }) => (
                <button
                  key={code}
                  className={`lang-option${i18n.language === code ? ' active' : ''}`}
                  onClick={() => changeLang(code)}
                >
                  <span className={`fi fi-${fi}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Burger — mobile only */}
        <button className="navbar-burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>

      </div>
    </nav>
  );
}

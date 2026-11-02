
import React, { useEffect, useState } from 'react';
import {
  Flame, Search, Bookmark, UserRound, BookOpen,
  ChevronLeft, Menu
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default function App() {
  const [page, setPage] = useState('خانه');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('همه');
  const [works, setWorks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [work, setWork] = useState(null);
  const [saved, setSaved] = useState([]);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const genres = [
    'همه', 'اکشن', 'فانتزی', 'درام',
    'عاشقانه', 'معمایی', 'علمی‌تخیلی'
  ];

  async function loadWorks() {
    if (!supabase) {
      setMessage('اطلاعات اتصال Supabase تنظیم نشده است.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('works')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('خطا در دریافت آثار: ' + error.message);
    } else {
      setWorks(data || []);
      setMessage('');
    }

    setLoading(false);
  }

  async function loadBookmarks(currentUser) {
    if (!supabase || !currentUser) {
      setSaved([]);
      return;
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('work_id')
      .eq('user_id', currentUser.id);

    if (!error) {
      setSaved((data || []).map(item => item.work_id));
    }
  }

  useEffect(() => {
    loadWorks();

    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      loadBookmarks(currentUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        loadBookmarks(currentUser);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function toggleBookmark(item) {
    if (!user) {
      setMessage('برای ذخیره آثار ابتدا وارد حساب کاربری شو.');
      setLogin(true);
      return;
    }

    const exists = saved.includes(item.id);

    if (exists) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('work_id', item.id)
        .eq('user_id', user.id);

      if (!error) {
        setSaved(old => old.filter(id => id !== item.id));
      } else {
        setMessage(error.message);
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, work_id: item.id });

      if (!error) {
        setSaved(old => [...old, item.id]);
      } else {
        setMessage(error.message);
      }
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage('اتصال دیتابیس تنظیم نشده است.');
      return;
    }

    const result = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else if (isSignup && !result.data.session) {
      setMessage('ثبت‌نام انجام شد. ایمیلت را برای تأیید بررسی کن.');
    } else {
      setLogin(false);
      setPassword('');
      setMessage('');
    }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSaved([]);
  }

  async function openWork(item) {
    setWork(item);
    setPage('جزئیات');
    setChapters([]);

    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('work_id', item.id)
      .order('chapter_number', { ascending: true });

    if (!error) setChapters(data || []);
  }

  const filteredWorks = works.filter(item => {
    const genresText = Array.isArray(item.genres)
      ? item.genres.join('، ')
      : (item.genres || '');

    return (
      (item.title || '').includes(query) &&
      (genre === 'همه' || genresText.includes(genre))
    );
  });

  const visibleWorks = page === 'ذخیره‌ها'
    ? works.filter(item => saved.includes(item.id))
    : filteredWorks;

  function cards(items) {
    return (
      <div className="grid">
        {items.map(item => (
          <article className="card" key={item.id}>
            <div className="cover" onClick={() => openWork(item)}>
              {item.cover_url && (
                <img src={item.cover_url} alt={item.title} />
              )}
              <span>{item.type || 'اثر'}</span>
              <button onClick={event => {
                event.stopPropagation();
                toggleBookmark(item);
              }}>
                <Bookmark
                  size={18}
                  fill={saved.includes(item.id) ? 'currentColor' : 'none'}
                />
              </button>
            </div>
            <small>{item.status || 'در حال انتشار'}</small>
            <h3 onClick={() => openWork(item)}>{item.title}</h3>
            <small>
              {Array.isArray(item.genres)
                ? item.genres.join('، ')
                : item.genres}
            </small>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <header>
        <a className="logo" onClick={() => setPage('خانه')}>
          <Flame /> AKUMA
        </a>

        <nav>
          <a onClick={() => setPage('خانه')}>خانه</a>
          <a onClick={() => setPage('آرشیو')}>آرشیو</a>
          <a onClick={() => setPage('ذخیره‌ها')}>علاقه‌مندی‌ها</a>
        </nav>

        <button className="user" onClick={() => user ? logout() : setLogin(true)}>
          <UserRound />
        </button>
        <button className="hamb"><Menu /></button>
      </header>

      {page === 'خانه' && (
        <>
          <section className="hero">
            <div>
              <small>به دنیای بی‌پایان داستان‌ها خوش آمدی</small>
              <h1>هر صفحه،<br /><b>یک جهان تازه.</b></h1>
              <p>مانهوا، مانگا و کمیک‌های محبوبت را در تجربه‌ای روان دنبال کن.</p>
              <button className="red" onClick={() => setPage('آرشیو')}>
                کشف داستان‌ها <ChevronLeft />
              </button>
            </div>
            <div className="sigil">悪</div>
          </section>

          <main>
            <h2>داستان‌های منتخب</h2>
            {loading ? <p>در حال دریافت آثار...</p> : cards(works.slice(0, 4))}
            <section className="banner">
              <h2>داستانت را گم نکن.</h2>
              <p>آثار موردعلاقه‌ات را ذخیره کن و دوباره به آن‌ها برگرد.</p>
            </section>
            <h2>تازه‌های آکوما</h2>
            {cards(works.slice(4))}
          </main>
        </>
      )}

      {page === 'آرشیو' && (
        <main>
          <small>کتابخانه آکوما</small>
          <h1>آرشیو داستان‌ها</h1>
          <div className="search">
            <Search />
            <input
              placeholder="جست‌وجوی اثر..."
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
          <div className="chips">
            {genres.map(item => (
              <button
                key={item}
                className={genre === item ? 'chosen' : ''}
                onClick={() => setGenre(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {cards(filteredWorks)}
        </main>
      )}

      {page === 'ذخیره‌ها' && (
        <main>
          <h1>علاقه‌مندی‌های من</h1>
          {user ? cards(visibleWorks) : <p>برای دیدن آثار ذخیره‌شده وارد حساب شو.</p>}
        </main>
      )}

      {page === 'جزئیات' && work && (
        <main>
          <button onClick={() => setPage('آرشیو')}>بازگشت ←</button>
          <div className="detail">
            {work.cover_url && <img src={work.cover_url} alt={work.title} />}
            <div>
              <small>{work.type} · {work.status}</small>
              <h1>{work.title}</h1>
              <p>{work.description}</p>
              <p>
                {Array.isArray(work.genres)
                  ? work.genres.join('، ')
                  : work.genres}
              </p>
              <button className="red" onClick={() => {
                if (chapters.length) setPage('مطالعه');
                else setMessage('هنوز فصلی برای این اثر ثبت نشده است.');
              }}>
                شروع مطالعه
              </button>
            </div>
          </div>

          <h2>فصل‌ها</h2>
          {chapters.length ? chapters.map(chapter => (
            <div
              className="chapter"
              key={chapter.id}
              onClick={() => {
                setWork({ ...work, activeChapter: chapter });
                setPage('مطالعه');
              }}
            >
              {chapter.title}
              <span>مطالعه ←</span>
            </div>
          )) : <p>هنوز فصلی برای این اثر ثبت نشده است.</p>}
        </main>
      )}

      {page === 'مطالعه' && (
        <main>
          <h1>{work?.title || 'محیط مطالعه'}</h1>
          {work?.activeChapter ? (
            <>
              <h2>{work.activeChapter.title}</h2>
              {(work.activeChapter.pages || []).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`صفحه ${index + 1}`}
                  style={{ width: '100%', display: 'block' }}
                />
              ))}
            </>
          ) : (
            <p>یک فصل را برای مطالعه انتخاب کن.</p>
          )}
          <button onClick={() => setPage('جزئیات')}>بازگشت به اثر</button>
        </main>
      )}

      {message && <p className="notice">{message}</p>}

      <footer>
        <b>🔥 AKUMA</b>
        <span>برای داستان‌هایی که در ذهن می‌مانند.</span>
        <small>© 2026 AKUMA</small>
      </footer>

      {login && (
        <div className="overlay">
          <form className="modal" onSubmit={handleAuth}>
            <button type="button" onClick={() => setLogin(false)}>✕</button>
            <h2>{isSignup ? 'ثبت‌نام در آکوما' : 'ورود به آکوما'}</h2>
            <input
              type="email"
              placeholder="ایمیل"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              placeholder="رمز عبور"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              minLength={6}
            />
            <button className="red" type="submit">
              {isSignup ? 'ثبت‌نام' : 'ورود'}
            </button>
            <p onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? 'حساب داری؟ ورود' : 'حساب نداری؟ ثبت‌نام کن'}
            </p>
            {message && <small>{message}</small>}
          </form>
        </div>
      )}
    </>
  );
}

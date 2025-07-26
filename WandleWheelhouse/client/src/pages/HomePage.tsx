import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Components
import Button from '../components/ui/Button';
import BlogCard from '../components/blog/BlogCard';
import IntentionForm from '../modals/IntentionFormProps';

// Services & Types
import BlogService from '../services/BlogService';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';

// Assets
import wheelhouseVideo from '../assets/wandle_wheel_video.webm';
import wheelhouseImage from '../assets/homepage_headline_image.jpg';

gsap.registerPlugin(ScrollTrigger);

// Types
interface AppDetail {
  name: string;
  subheader: string;
  desc: string;
  buttonText: string;
  id: string;
  imageUrl: string;
}

interface WorkStep {
  step: string;
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
}

// Constants
const STICKY_NAVBAR_HEIGHT = 0;
const CONSTRAINED_SECTION_WIDTH = "w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8";
const CONSTRAINED_SECTION_BASE = "min-h-[600px] rounded-2xl shadow-xl relative flex flex-col items-center justify-start text-center p-8 md:p-12 bg-white border border-gray-200/50";

const APP_DETAILS: AppDetail[] = [
  {
    name: "Core Values",
    subheader: "Our Foundation",
    desc: "We believe in integrity, community focus, and innovation to drive positive change for all.",
    buttonText: "Discover Values",
    id: "m1",
    imageUrl: "https://images.unsplash.com/photo-1750779940304-95eb48d09b5c?q=80&w=1375&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Community Programs",
    subheader: "Making a Difference",
    desc: "Explore our diverse programs designed to support and uplift every member of our community.",
    buttonText: "Explore Programs",
    id: "m2",
    imageUrl: "https://images.unsplash.com/photo-1750232533953-80b7740a85b5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Impact Stories",
    subheader: "Real Lives, Real Impact",
    desc: "Read inspiring stories of transformation and resilience from individuals we've supported.",
    buttonText: "Read Stories",
    id: "m3",
    imageUrl: "https://images.unsplash.com/photo-1750173588233-8cd7ba259c15?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Get Involved",
    subheader: "Join Our Mission",
    desc: "Discover various ways you can contribute your time, skills, or resources to help us grow.",
    buttonText: "Volunteer Now",
    id: "m4",
    imageUrl: "https://plus.unsplash.com/premium_photo-1724413941655-24c6eb2b28c3?q=80&w=687&auto=format&fit=fit&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Future Vision",
    subheader: "Building Tomorrow, Today",
    desc: "Learn about our ambitious plans for expanding our reach and deepening our community impact.",
    buttonText: "See Our Vision",
    id: "m5",
    imageUrl: "https://images.unsplash.com/photo-1749627995669-4d4dda3a9c1d?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  }
];

const WORK_STEPS: WorkStep[] = [
  {
    step: "STEP 1",
    title: "IDENTIFYING STRENGTHS AND WEAKNESSES",
    description: "Our multidisciplinary team is here to identify both your strengths and weaknesses, with the ambition to understand how to best assist in growing your brand and reaching your community.",
    bgColor: "bg-amber-500",
    textColor: "text-white",
  },
  {
    step: "STEP 2",
    title: "PUTTING THE PIECES TOGETHER",
    description: "Based on research and discussions, we will single out the best medium or mediums to translate your brand.",
    bgColor: "bg-indigo-900",
    textColor: "text-white",
  },
  {
    step: "STEP 3",
    title: "FINE-TUNING YOUR CONTENT",
    description: "By presenting our work to you through open dialogue, we will fine-tune your content based on feedback and our collective expertise.",
    bgColor: "bg-slate-700",
    textColor: "text-white",
  },
  {
    step: "STEP 4",
    title: "COMPLETING THE PICTURE",
    description: "Whether producing photography, film, curating your digital platforms, or creating a cohesive brand identity and strategy, we will package up all our work and assets into an organized library—a package that is simple for you to engage with.",
    bgColor: "bg-teal-600",
    textColor: "text-white",
  },
];

// Custom Hooks
const useBlogPosts = () => {
  const [blogPosts, setBlogPosts] = useState<BlogArticleCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await BlogService.getPublishedArticles(1, 5);
        setBlogPosts(result.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load blog posts.';
        setError(message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return { blogPosts, loading, error };
};

// Components
const HeroSection: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoElement.play();
          } else {
            videoElement.pause();
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the video is visible
    );

    observer.observe(videoElement);

    return () => {
      observer.unobserve(videoElement);
    };
  }, []);

  return (
    <section className="w-full relative">
      <div className="min-h-screen flex items-center justify-center p-8 md:p-16 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={wheelhouseImage}
        >
          <source src={wheelhouseVideo} type="video/webm" />
          <img src={wheelhouseImage} alt="Fallback background" className="w-full h-full object-cover" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40" />

        <div className="relative flex flex-col md:flex-row items-center justify-between w-full max-w-[1600px] mx-auto z-10 mt-12 sm:mt-16 md:mt-20">
          <div className="md:w-1/2" />

          <div className="md:w-2/3 text-right rounded-2xl p-8 md:p-12 border border-white/100">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 drop-shadow-xl tracking-tight opacity-0 translate-y-5 animate-[rise_1s_ease-out_0.5s_forwards]">
              Welcome to Wandle Wheelhouse!
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl font-medium text-white/90 max-w-lg ml-auto drop-shadow-md opacity-0 translate-y-5 animate-[rise_1s_ease-out_1s_forwards]">
              Together, we build a stronger Merton—uniting hearts, uplifting lives, and creating opportunities for all!
            </p>

            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={onOpenModal}
                className="py-3 px-6 text-base sm:text-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 hover:scale-105 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Book a Tour Today!
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rise {
          to {
            opacity: 1;
            transform: translateY(-30px);
          }
        }
      `}</style>
    </section>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="flex space-x-4 sm:space-x-6 overflow-x-auto py-6 w-full scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-indigo-100 snap-x snap-mandatory">
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        className="min-w-[280px] sm:min-w-[300px] max-w-[320px] sm:max-w-[340px] h-[480px] sm:h-[520px] bg-white rounded-2xl shadow-lg animate-pulse flex-shrink-0 snap-center flex flex-col transition-all duration-300 hover:-translate-y-1"
      >
        <div className="h-[320px] sm:h-[360px] bg-gray-200 rounded-t-2xl" />
        <div className="p-6 sm:p-8 space-y-4 sm:space-y-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="h-6 sm:h-7 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/2 mt-3" />
            <div className="h-5 bg-gray-200 rounded w-5/6 mt-3" />
          </div>
          <div className="h-5 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center shadow-lg max-w-md mx-auto">
    <ExclamationCircleIcon className="h-12 sm:h-14 w-12 sm:w-14 text-red-500 mx-auto mb-4" />
    <p className="text-red-600 font-semibold text-base sm:text-lg">Error: {error}</p>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg max-w-md mx-auto">
    <p className="text-gray-600 font-semibold text-base sm:text-lg">No recent blog posts available yet.</p>
    <p className="text-gray-500 mt-3 text-sm sm:text-base">Check back later for new content!</p>
  </div>
);

const BlogSection: React.FC = () => {
  const { blogPosts, loading, error } = useBlogPosts();
  const blogScrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className={`${CONSTRAINED_SECTION_WIDTH} my-16 md:my-24`}>
      <div className={`${CONSTRAINED_SECTION_BASE} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight">
          From the Blog
        </h2>

        <div className="w-full flex flex-col lg:flex-row gap-8 sm:gap-12 mb-12 sm:mb-16">
          <div className="lg:w-2/3 relative order-1 lg:order-2">
            {loading && <LoadingSkeleton />}
            {error && <ErrorState error={error} />}
            {!loading && !error && blogPosts.length === 0 && <EmptyState />}

            {!loading && !error && blogPosts.length > 0 && (
              <div className="relative">
                <div
                  className="flex space-x-4 sm:space-x-6 overflow-x-auto py-6 w-full scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-indigo-100 snap-x snap-mandatory"
                  ref={blogScrollRef}
                >
                  {blogPosts.map((post) => (
                    <div
                      key={post.blogArticleId}
                      className="min-w-[280px] sm:min-w-[300px] max-w-[320px] sm:max-w-[340px] h-[480px] sm:h-[520px] flex-shrink-0 snap-center flex flex-col transition-all duration-300 hover:-translate-y-1"
                    >
                      <BlogCard article={post} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-1/3 flex flex-col justify-start text-center lg:text-left order-2 lg:order-1 mt-8 lg:mt-0">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Community Stories
            </h3>
            <h4 className="text-lg sm:text-xl font-semibold text-gray-600 mb-4">
              Insights & Updates
            </h4>
            <p className="text-gray-700 text-base sm:text-lg mb-6 leading-relaxed">
              Discover the latest news, events, and inspiring stories from the Wandle Wheelhouse community.
              Stay connected with our efforts to make a difference in Merton.
            </p>

            <Link to="/blog">
              <Button
                variant="primary"
                className="w-full sm:w-3/4 lg:w-fit py-3 px-6 text-base sm:text-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 hover:scale-105 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Latest Posts
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const WorkStepCard: React.FC<{ step: WorkStep }> = ({ step }) => (
  <article
    className={`min-h-[60vh] sm:min-h-[70vh] ${step.bgColor} ${step.textColor} flex flex-col justify-center items-center px-4 sm:px-8 py-12 sm:py-16 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-1`}
  >
    <header className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 tracking-wide">
      {step.step}
    </header>
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
      {step.title}
    </h2>
    <p className="text-base sm:text-lg md:text-xl max-w-3xl text-center leading-relaxed">
      {step.description}
    </p>
  </article>
);

const HowWeWorkSection: React.FC = () => (
  <section className="w-full bg-gray-50 py-12 md:py-16">
    <article className="min-h-[50vh] sm:min-h-[60vh] flex flex-col justify-center items-center bg-indigo-900 text-white text-center px-4 sm:px-6">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">How We Work</h1>
    </article>

    <article className="min-h-[40vh] flex flex-col justify-center items-center text-center bg-slate-100 px-4 sm:px-6">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">Welcome</h2>
      <p className="text-lg sm:text-xl text-gray-600 mt-4 max-w-2xl">Scroll down to find out more</p>
    </article>

    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8 sm:py-12">
      {WORK_STEPS.map((step, index) => (
        <WorkStepCard key={index} step={step} />
      ))}
    </div>

    <article className="min-h-[200vh] bg-teal-100 flex items-center justify-center">
      <p className="text-2xl text-teal-800 p-8 text-center">
        Very Tall Scrollable Content After Mission Section - Part 1. This section is made extra tall to ensure the page has enough scroll length for the pinned animation to complete.
      </p>
    </article>

    <article className="min-h-[200vh] bg-purple-100 flex items-center justify-center">
      <p className="text-2xl text-purple-800 p-8 text-center">
        Further Tall Scrollable Content - Part 2. If the scrollbar still snaps back, this content might need to be even taller, or the ScrollTrigger 'end' value might be too large for the overall page design (or too small if markers show 'end' is hit early).
      </p>
    </article>
  </section>
);

// Main Component
const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs for Mission Section App Switcher & GSAP
  const missionSectionRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const appHeaderRef = useRef<HTMLHeadingElement>(null);
  const appSubheaderRef = useRef<HTMLHeadingElement>(null);
  const appDescriptionRef = useRef<HTMLParagraphElement>(null);
  const appButtonRef = useRef<HTMLButtonElement>(null);
  const navDotsRef = useRef<HTMLDivElement>(null);

  const initializeAppSwitcher = useCallback(() => {
    const switcher = switcherRef.current;
    const leftColumn = leftColumnRef.current;
    const appHeader = appHeaderRef.current;
    const appSubheader = appSubheaderRef.current;
    const appDescription = appDescriptionRef.current;
    const appButton = appButtonRef.current;
    const navDotsContainer = navDotsRef.current;

    if (!switcher || !leftColumn || !appHeader || !appSubheader || !appDescription || !appButton || !navDotsContainer) {
      return;
    }

    // Clear existing content
    switcher.innerHTML = '';
    navDotsContainer.innerHTML = '';

    const cards: HTMLElement[] = [];
    const dots: HTMLElement[] = [];
    let currentIndex = 0;

    // Create cards
    APP_DETAILS.forEach((detail, i) => {
      const card = document.createElement("div");
      card.className = "card absolute w-[90%] h-[600px] md:w-[400px] rounded-[20px] drop-shadow-lg transition-transform duration-100 ease-in-out opacity-0 overflow-hidden";
      card.innerHTML = `
        <img src="${detail.imageUrl}" alt="${detail.name}" class="absolute inset-0 w-full h-full object-cover rounded-[20px] z-0">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
        <div class="card-content relative h-full flex flex-col justify-end items-center p-5 text-center text-white z-20">
          <h3 class="m-0 mb-2 text-2xl font-bold">${detail.name}</h3>
          <p class="m-0 text-sm">${detail.desc}</p>
        </div>`;
      card.style.zIndex = `${APP_DETAILS.length - i}`;
      switcher.appendChild(card);
      cards.push(card);

      // Create navigation dot
      const dot = document.createElement("div");
      dot.className = "w-2 h-2 bg-gray-400 rounded-full cursor-pointer transition-all duration-300 mx-1 my-2";
      dot.onclick = () => {
        const triggerElement = missionSectionRef.current;
        if (!triggerElement) return;

        const stInstance = ScrollTrigger.getById("missionAppSwitcher");
        const targetScrollPos = (stInstance ? stInstance.start : triggerElement.offsetTop) + i * scrollPixelsPerCardTransition;

        gsap.to(window, {
          duration: 0.8,
          scrollTo: { y: targetScrollPos, autoKill: false },
          ease: "power2.inOut",
          onComplete: () => ScrollTrigger.refresh()
        });
      };
      navDotsContainer.appendChild(dot);
      dots.push(dot);
    });

    // Initialize all left column elements to be ready for animation
    gsap.set([appHeader, appSubheader, appDescription, appButton], { yPercent: 100, opacity: 0 });

    const updateLeftColumnContent = (index: number) => {
      const currentApp = APP_DETAILS[index];
      gsap.set(appHeader, { textContent: currentApp.name });
      gsap.set(appSubheader, { textContent: currentApp.subheader });
      gsap.set(appDescription, { textContent: currentApp.desc });
      gsap.set(appButton, { textContent: currentApp.buttonText });
      appButton.onclick = () => alert(`Opening ${currentApp.name}!`);
    };

    // Keep a reference to the previous index to determine scroll direction
    let prevIndex = 0;

    const animateLeftColumn = (newIndex: number) => {
      if (newIndex === prevIndex) return; // Prevent unnecessary animation if index hasn't changed

      const isScrollingDown = newIndex > prevIndex;
      prevIndex = newIndex; // Update prevIndex for next scroll event

      // Determine the content for the NEXT card (or previous if scrolling up)
      // If scrolling down, show the content of the current (newIndex) card
      // If scrolling up, show the content of the current (newIndex) card
      const contentToShowIndex = newIndex;


      const tl = gsap.timeline({ defaults: { duration: 0.4, ease: "power2.out" } });

      // Animate out the old content
      tl.to([appHeader, appSubheader, appDescription, appButton], {
        yPercent: isScrollingDown ? -100 : 100, // Move up (down scroll) or down (up scroll)
        opacity: 0,
        stagger: 0.05,
      });

      // Set the new content immediately after the old content starts moving out,
      // but before the new content animates in.
      tl.call(() => {
        updateLeftColumnContent(contentToShowIndex);
      }, [], "<0.1"); // Call slightly after the start of the 'out' animation

      // Animate in the new content
      tl.fromTo([appHeader, appSubheader, appDescription, appButton],
        { yPercent: isScrollingDown ? 100 : -100, opacity: 0 }, // Start from below (down scroll) or above (up scroll)
        { yPercent: 0, opacity: 1, stagger: 0.05 },
        "<0.1" // Start this tween slightly after the call
      );
    };


    // Set a negative baseOffsetY to make cards pop out above the container
    const baseOffsetY = -10; // Increased negative value for a more pronounced "pop"

    const updateCards = (index: number) => {
      if (!switcher || cards.length === 0) return;

      const switcherWidth = switcher.offsetWidth;
      const cardWidth = cards[0].offsetWidth;
      const centerX = (switcherWidth / 2) - (cardWidth / 2);

      cards.forEach((card, i) => {
        const offset = i - index; // This calculates the offset relative to the CURRENTLY ACTIVE card
        let yTranslate = baseOffsetY;
        let scale = 1;
        let opacity = 1;
        let zIndex = APP_DETAILS.length - i; // Keep initial zIndex logic

        // Logic for cards:
        // The 'active' card is at index.
        // The card that just moved up (offset = -1) should hide
        // Cards below the active card (offset > 0) should be visible and stacked.

        if (offset < 0) {
          // Cards that have already passed (scrolled up)
          yTranslate = baseOffsetY - 100; // Move them further up and off-screen
          scale = 1;
          opacity = 0; // Hide them
          zIndex = 0; // Send to back
        } else if (offset === 0) {
          // The current active card
          yTranslate = baseOffsetY; // This is where the card will "pop out" to
          scale = 1;
          opacity = 1;
          zIndex = APP_DETAILS.length; // Bring to front
        } else {
          // Cards that are yet to come (below the active card)
          yTranslate = baseOffsetY + (20 + 30 * (offset - 1)); // Adjust vertical spacing relative to the new baseOffsetY
          scale = 1 - 0.05 * (offset - 1); // Slight scaling for perspective
          opacity = 1;
          zIndex = APP_DETAILS.length - i; // Maintain stack order
        }

        gsap.to(card, {
          duration: 0.5,
          x: centerX,
          y: yTranslate,
          scale: scale,
          opacity: opacity,
          zIndex: zIndex, // Apply z-index change
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      updateDots(index);
    };

    const updateDots = (index: number) => {
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add("bg-green-500", "scale-125");
          dot.classList.remove("bg-gray-400", "scale-100");
        } else {
          dot.classList.remove("bg-green-500", "scale-125");
          dot.classList.add("bg-gray-400", "scale-100");
        }
      });
    };

    // Initial setup: set content and animate first state into view
    updateLeftColumnContent(currentIndex);
    gsap.fromTo([appHeader, appSubheader, appDescription, appButton],
      { yPercent: 100, opacity: 0 }, // Start from below
      { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: "power2.out" }
    );
    setTimeout(() => updateCards(currentIndex), 100);


    const totalCards = APP_DETAILS.length;
    const scrollPixelsPerCardTransition = 500;
    const totalPinDuration = (totalCards - 1) * scrollPixelsPerCardTransition;

    const st = ScrollTrigger.create({
      id: "missionAppSwitcher",
      trigger: missionSectionRef.current,
      start: `top top+=${STICKY_NAVBAR_HEIGHT}px`,
      end: `+=${totalPinDuration}`,
      pin: true,
      scrub: 0.5,
      snap: {
        snapTo: 1 / (totalCards - 1),
        duration: 0.3,
        ease: "power2.inOut",
      },
      onUpdate: (self) => {
        const newIndex = Math.round(self.progress * (totalCards - 1));
        if (newIndex !== currentIndex) {
          animateLeftColumn(newIndex); // Trigger text animations for the new index
          currentIndex = newIndex;
          updateCards(currentIndex); // Updates card animations for the new index
        }
      },
      // Ensure the first card's content is displayed immediately on entering
      onEnter: () => {
        if (currentIndex !== 0) { // Only animate if not already at the first index
          animateLeftColumn(0);
          currentIndex = 0;
          updateCards(currentIndex);
        }
      },
      // On leaving back (scrolling up past the start), reset to the first content
      onLeaveBack: () => {
        if (currentIndex !== 0) { // Only animate if not already at the first index
          animateLeftColumn(0);
          currentIndex = 0;
          updateCards(currentIndex);
        }
      },
    });

    const resizeObserver = new ResizeObserver(entries => {
      if (switcher && entries.some(entry => entry.target === switcher)) {
        gsap.to({}, {
          duration: 0.1,
          onComplete: () => updateCards(currentIndex)
        });
      }
    });

    resizeObserver.observe(switcher);

    return () => {
      resizeObserver.disconnect();
      st.kill();
    };
  }, []);

  useLayoutEffect(() => {
    return initializeAppSwitcher();
  }, [initializeAppSwitcher]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 scroll-smooth font-sans">
      <HeroSection onOpenModal={handleOpenModal} />

      <IntentionForm isOpen={isModalOpen} onRequestClose={handleCloseModal} />

      {/* Mission Section */}
      <section ref={missionSectionRef} className={`${CONSTRAINED_SECTION_WIDTH} mt-16 md:mt-24`}>
        <div className={`${CONSTRAINED_SECTION_BASE} flex flex-col items-center justify-start`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight pt-4 md:pt-8">
            Our Mission
          </h2>

          <div className="container flex flex-col md:flex-row w-full h-[79vh] md:h-[600px] relative bg-gray-900">
            {/* Left Column */}
            <div
              ref={leftColumnRef}
              className="left-column w-full md:w-[40%] h-[40vh] md:h-full px-2 md:p-10 flex flex-col justify-center bg-gray-900 text-white rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none text-center md:text-left overflow-hidden"
            >
              <h1 ref={appHeaderRef} className="text-2xl md:text-4xl font-bold mb-2">App Switcher</h1>
              <h2 ref={appSubheaderRef} className="text-xl md:text-2xl text-gray-300 mb-4">Explore Your Apps</h2>
              <p ref={appDescriptionRef} className="text-sm md:text-base leading-relaxed mb-5 max-w-[400px] mx-auto md:mx-0">
                Quickly navigate through our key initiatives and focus areas.
              </p>
              <button
                ref={appButtonRef}
                className="py-2 px-5 text-base bg-blue-600 text-white border-none rounded-xl cursor-pointer transition-colors duration-300 hover:bg-blue-700 self-center md:self-start"
              >
                Get Started
              </button>
            </div>

            {/* Middle Column - Cards */}
            <div
              ref={switcherRef}
              className="switcher w-full md:w-[55%] relative h-full overflow-visible perspective-[1200px] rounded-b-2xl md:rounded-r-none md:rounded-bl-none" // Changed overflow-hidden to overflow-visible
            />

            {/* Navigation Dots */}
            <div
              ref={navDotsRef}
              className="flex flex-row w-full h-auto py-2 justify-center items-center bg-gray-900 rounded-b-2xl md:flex-col md:w-[5%] md:rounded-r-2xl md:rounded-bl-none md:p-2 z-30"
            />
          </div>
        </div>
      </section>

      <HowWeWorkSection />
      <BlogSection />
    </div>
  );
};

export default HomePage;
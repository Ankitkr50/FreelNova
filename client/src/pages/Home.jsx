import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import heroVideo from "../assets/home-hero.mp4";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import Globe from "../components/Globe.jsx";
import MacbookMockup from "../components/MacbookMockup.jsx";


const trustedBy = [
  {
    name: "Meta",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M3.5 14.2C3.5 9.8 5.8 6.5 8.5 6.5c2.5 0 3.8 4.1 5.5 7.1 1.2 2.1 2 3.4 3.2 3.4 1.4 0 2.3-1.6 2.3-4.2 0-3.4-1.5-5.8-3.7-5.8-2.5 0-3.8 4.1-5.5 7.1-1.2 2.1-2 3.4-3.2 3.4-2.2 0-3.6-2.4-3.6-3.3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Google",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M21 12.23c0-.76-.07-1.49-.19-2.2H12v4.16h5.04a4.32 4.32 0 0 1-1.87 2.83v2.35h3.03c1.77-1.63 2.8-4.04 2.8-7.14Z" fill="#4285F4" />
        <path d="M12 21c2.52 0 4.64-.83 6.19-2.26l-3.03-2.35c-.84.57-1.92.91-3.16.91-2.43 0-4.5-1.64-5.24-3.85H3.63v2.42A9 9 0 0 0 12 21Z" fill="#34A853" />
        <path d="M6.76 13.45A5.4 5.4 0 0 1 6.46 12c0-.5.1-.99.3-1.45V8.13H3.63A9 9 0 0 0 3 12c0 1.45.35 2.82.97 4.02l2.79-2.57Z" fill="#FBBC05" />
        <path d="M12 6.7c1.37 0 2.6.47 3.57 1.38l2.67-2.67C16.64 3.92 14.52 3 12 3 8.48 3 5.43 5.02 3.63 8.13l3.13 2.42C7.5 8.34 9.57 6.7 12 6.7Z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    name: "Netflix",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M8 3v18l8-2.2V3h-3v10.2L11 3H8Z" fill="#E50914" />
      </svg>
    ),
  },
  {
    name: "P&G",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" fill="currentColor" className="text-sky-600" />
        <path d="M9 8.5h3.2a2.3 2.3 0 1 1 0 4.6H11v2.4H9V8.5Zm2 .2v2.3h1c.8 0 1.2-.4 1.2-1.15S12.8 8.7 12 8.7h-1Zm8 3.3v3.5h-1.3l-.1-.7c-.5.6-1.2.9-2 .9-1.8 0-3.1-1.3-3.1-3.1s1.4-3.2 3.3-3.2c1.3 0 2.5.7 2.9 1.8l-1.7.5a1.2 1.2 0 0 0-1.2-.8c-.9 0-1.5.7-1.5 1.7s.6 1.7 1.5 1.7c.7 0 1.1-.3 1.3-.8h-1.4V12h3.3Z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "PayPal",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M8.4 4h6.1c2.5 0 4 1.6 3.6 3.8-.4 2.4-2.3 3.8-4.9 3.8H10L8.8 19H6.1L8.4 4Z" fill="#003087" />
        <path d="M10.8 6.1h4.3c1.7 0 2.6 1 2.3 2.3-.3 1.5-1.5 2.4-3.3 2.4h-2.7l-.6 3.4H8.9l1.9-8.1Z" fill="#009CDE" />
      </svg>
    ),
  },
  {
    name: "Payoneer",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M6 14.4a4.2 4.2 0 1 1 3.8-6h-2A2.4 2.4 0 1 0 10 12h5.8a4.2 4.2 0 1 1-3.8 6h2a2.4 2.4 0 1 0-2.2-3.6H6Z" fill="url(#payoneerGradient)" />
        <defs>
          <linearGradient id="payoneerGradient" x1="6" y1="6.2" x2="18" y2="17.8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF4800" />
            <stop offset="1" stopColor="#FF9B00" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
];

const categoryCards = [
  {
    title: "Programming & Tech",
    image: "https://c8.alamy.com/comp/JF5KA3/color-background-tech-computer-with-icons-programming-codes-and-light-JF5KA3.jpg",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="4.5" width="17" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 19.5h8M10 15.5v4M14 15.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Graphics & Design",
    image: "https://tse4.mm.bing.net/th/id/OIP.OLyXeEINfOPiBA4iaEPjaQHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="4.5" width="15" height="15" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M5 19l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Digital Marketing",
    image: "https://static.vecteezy.com/system/resources/previews/000/679/368/original/digital-marketing-icons-in-light-bulb-shape.jpg",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <path d="M5 18.5V7.2a1.7 1.7 0 0 1 2.6-1.4l8.3 5a1.7 1.7 0 0 1 0 2.9l-8.3 5A1.7 1.7 0 0 1 5 18.5Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M18 7.5c1.8 1.2 3 2.8 3 4.5s-1.2 3.3-3 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Writing & Translation",
    image: "https://thumbs.dreamstime.com/b/light-bulb-creativity-language-character-letter-block-arrows-representing-translation-innovation-communication-ideal-learning-402723045.jpg?w=576",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="12.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M14 5.5h6M17 5.5v7M6 8h2.5M7.2 6.7c-.1 1.8-.9 3.3-2.2 4.5M6.1 8.8c.8 1 1.7 1.7 2.9 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Video & Animation",
    image: "https://cdn.educba.com/academy/wp-content/uploads/2024/05/Computer-Animation.jpg",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5" width="14" height="14" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
        <path d="m10 9 4 3-4 3V9Z" fill="currentColor" />
        <path d="M17.5 9.2 21 7v10l-3.5-2.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "AI Services",
    image: "https://th.bing.com/th/id/OIP.s-ltzk15R68svDUmEQ_sKwHaEe?w=268&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="9" cy="10" r="1.2" fill="currentColor" />
        <path d="m8 16 3.2-3.2a1.4 1.4 0 0 1 2 0L16 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m14 7.5 1.1 1.1L18 5.7M18 5.7V9M18 5.7h-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Music & Audio",
    image: "https://static.vecteezy.com/system/resources/thumbnails/047/510/107/small_2x/music-production-studio-with-synthesizer-and-sound-equipment-photo.jpg",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <path d="M14 5v10.5a2.5 2.5 0 1 1-1.7-2.4V7.5l8-2V13a2.5 2.5 0 1 1-1.7-2.4V4L14 5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Business",
    image: "https://static.vecteezy.com/system/resources/previews/032/159/666/non_2x/business-meeting-at-a-large-table-in-a-bright-office-with-large-windows-business-concept-ai-generated-image-photo.jpg",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <path d="M4 17c1.4-2 3.6-3 6-3s4.6 1 6 3M7.5 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16.5 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 18.5h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Consulting",
    image: "https://media.gettyimages.com/id/965397064/photo/consulting-business-concept-chart-with-keywords-and-icons.jpg?b=1&s=2048x2048&w=0&k=20&c=pIRWoHRHSeHiBQ3MNZcGXX4meIWjT5WT8z7kk2aL_c0=",
    icon: (
      <svg aria-hidden="true" className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="4.5" width="8" height="15" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <rect x="12.5" y="8.5" width="8" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7.5 8h.01M16.5 12h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const popularServices = [
  "Vibe Coding",
  "Website Development",
  "Video Editing",
  "Software Development",
  "Book Publishing",
  "Architecture & Interior Design",
  "Book Design",
  "UGC Videos",
  "Voice Over",
  "Social Media Marketing",
  "AI Development",
  "Logo Design",
  "Website Design",
];

const serviceVisuals = {
  "Vibe Coding": {
    image:
      "https://th.bing.com/th/id/OIP.s-ltzk15R68svDUmEQ_sKwHaEe?w=268&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
    position: "center center",
  },
  "Website Development": {
    image:
      "https://c8.alamy.com/comp/JF5KA3/color-background-tech-computer-with-icons-programming-codes-and-light-JF5KA3.jpg",
    position: "center center",
  },
  "Video Editing": {
    image:
      "https://cdn.educba.com/academy/wp-content/uploads/2024/05/Computer-Animation.jpg",
    position: "center center",
  },
  "Software Development": {
    image:
      "https://okcredit-blog-images-prod.storage.googleapis.com/2021/03/Software-Development-Business1--1-.jpg",
    position: "center center",
  },
  "Book Publishing": {
    image:
      "https://tse2.mm.bing.net/th/id/OIP.pnEhjI9dCjuWd1Ar0qNP6AHaEK?r=0&w=1280&h=720&rs=1&pid=ImgDetMain&o=7&rm=3",
    position: "center center",
  },
  "Architecture & Interior Design": {
    image:
      "https://tse4.mm.bing.net/th/id/OIP.xK6gQhTW1wXiJ4RZ1PMoRgHaDo?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    position: "center center",
  },
  "Book Design": {
    image:
      "https://static.vecteezy.com/system/resources/previews/022/159/451/original/book-cover-simple-minimalist-design-softcover-poster-design-vector.jpg",
    position: "center center",
  },
  "UGC Videos": {
    image:
      "https://tse2.mm.bing.net/th/id/OIP.uZErAIOxflwcQMPQ2lVP8QHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    position: "center center",
  },
  "Voice Over": {
    image:
      "https://static.vecteezy.com/system/resources/thumbnails/047/510/107/small_2x/music-production-studio-with-synthesizer-and-sound-equipment-photo.jpg",
    position: "center center",
  },
  "Social Media Marketing": {
    image:
      "https://static.vecteezy.com/system/resources/previews/000/679/368/original/digital-marketing-icons-in-light-bulb-shape.jpg",
    position: "center center",
  },
  "AI Development": {
    image:
      "https://accountabilitynow.net/wp-content/uploads/2025/11/7-essential-ways-to-use-ai-to-grow-your-business-in-2025-2.jpg",
    position: "center center",
  },
  "Logo Design": {
    image:
      "https://tse2.mm.bing.net/th/id/OIP.FVJEmhbcCa1gsSAIhk_YqAHaFL?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    position: "center center",
  },
  "Website Design": {
    image:
      "https://tse1.mm.bing.net/th/id/OIP.DJasaVQnYsWuYX46W9LsuQHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    position: "center center",
  },
};

const marketplaceBenefits = [
  "Access a pool of top talent across 700 categories",
  "Enjoy a simple, easy-to-use matching experience",
  "Get quality work done quickly and within budget",
  "Only pay when you're happy",
];

const benefitIcons = [
  (
    <svg aria-hidden="true" className="h-11 w-11 text-current" viewBox="0 0 24 24" fill="none">
      <path d="M5 5h4v4H5zm0 7h4v4H5zm0 7h4v4H5zm7-14h4v4h-4zm0 7h4v4h-4zm7-7h4v4h-4zM19 19h-4m2-2v4M12 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg aria-hidden="true" className="h-11 w-11 text-current" viewBox="0 0 24 24" fill="none">
      <path d="M12 4a8 8 0 1 1-5.66 2.34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 2.8v4.5h4.5M12 8.7v3.5l2.2 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m19.6 16.4 1.7 1.7m0-1.7-1.7 1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg aria-hidden="true" className="h-11 w-11 text-current" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4.8" width="10.5" height="14.4" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 8.2 8.6 12H11l-1 3.8 4.1-5.5h-2.5l1-2.1H10Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7V5m0 14v-2M1 12h2m16 0h2M18.8 5.2l1.4-1.4M18.8 18.8l1.4 1.4M3.8 20.2l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg aria-hidden="true" className="h-11 w-11 text-current" viewBox="0 0 24 24" fill="none">
      <path d="M4 8.5h7.5a3.5 3.5 0 1 1 0 7H9.8L7 18.3V15.5H4.8A2.8 2.8 0 0 1 2 12.7v-1.4A2.8 2.8 0 0 1 4.8 8.5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.2 5.7H19a3 3 0 0 1 3 3V10a3 3 0 0 1-3 3h-1.8v2.5l-2.5-2.5h-.5a3 3 0 0 1-3-3V8.7a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16.2 8.5h3.5M18 6.7v3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
];

const guides = [
  "Start a side business",
  "Ecommerce business ideas",
  "Start an online business and work from home",
  "Build a website from scratch",
  "Grow your business with AI",
  "Create a logo for your business",
];

const guideVisuals = {
  "Start a side business":
    "https://cdn.cmsfly.com/635bcad9b8a74e0091632998/images/UsethisDorikBlogThumbnail1200670px--3hQ3.png",
  "Ecommerce business ideas":
    "https://tse4.mm.bing.net/th/id/OIP.HZl99Up2wIcaHIztLLmttAHaE7?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
  "Start an online business and work from home":
    "https://tse2.mm.bing.net/th/id/OIP.3LWjbs_sUFmlLI9erivILAHaDo?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
  "Build a website from scratch":
    "https://tse1.mm.bing.net/th/id/OIP.DJasaVQnYsWuYX46W9LsuQHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
  "Grow your business with AI":
    "https://accountabilitynow.net/wp-content/uploads/2025/11/7-essential-ways-to-use-ai-to-grow-your-business-in-2025-2.jpg",
  "Create a logo for your business":
    "https://tse2.mm.bing.net/th/id/OIP.FVJEmhbcCa1gsSAIhk_YqAHaFL?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
};

const sourcingProfiles = [
  {
    image:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?cs=srgb&dl=pexels-olly-774909.jpg&fm=jpg",
    className: "left-8 top-14 h-72 w-44 opacity-40",
  },
  {
    image:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?cs=srgb&dl=pexels-pixabay-415829.jpg&fm=jpg",
    className: "left-28 top-4 z-10 h-96 w-56",
  },
  {
    image:
      "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?cs=srgb&dl=pexels-olly-614810.jpg&fm=jpg",
    className: "right-8 top-14 h-72 w-44 opacity-40",
  },
];

const footerCatalog = {
  Categories: [
    "Graphics & Design",
    "Digital Marketing",
    "Writing & Translation",
    "Video & Animation",
    "Music & Audio",
    "Programming & Tech",
    "AI Services",
    "Consulting",
    "Business",
  ],
  "For Clients": [
    "How FreelNova Works",
    "Customer Success Stories",
    "Quality Guide",
    "FreelNova Guides",
    "Browse Freelance by Skill",
  ],
  "For Freelancers": [
    "Become a FreelNova Freelancer",
    "Become an Agency",
    "Community Hub",
    "Forum",
    "Events",
  ],
  "Business Solutions": [
    "FreelNova Pro",
    "Project Management Service",
    "Expert Sourcing Service",
    "AI Store Builder",
    "Logo Maker",
  ],
  Company: [
    "About FreelNova",
    "Help Center",
    "Trust & Safety",
    "Careers",
    "Terms of Service",
    "Privacy Policy",
  ],
};

const laptopKeyboardRows = [
  ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
  ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
  ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
  ["fn", "ctrl", "opt", "cmd", "space", "cmd", "opt", "<", "^", ">"],
];

function Home() {
  const { isAuthenticated } = useAuth();
  const [laptopFold, setLaptopFold] = useState(0);
  const laptopRef = useRef(null);

  const getFooterLink = (item) => {
    // Public corporate and policy links are accessible without authentication
    switch (item) {
      case "About FreelNova":
      case "Careers":
      case "Help Center":
      case "Trust & Safety":
      case "Terms of Service":
      case "Privacy Policy":
        return ROUTES.COMPANY_INFO;
    }

    if (!isAuthenticated) {
      return ROUTES.REGISTER;
    }
    switch (item) {
      case "Graphics & Design":
        return `${ROUTES.PROJECTS}?category=Design`;
      case "Digital Marketing":
        return `${ROUTES.PROJECTS}?category=Marketing`;
      case "Writing & Translation":
        return `${ROUTES.PROJECTS}?category=Writing`;
      case "Video & Animation":
        return `${ROUTES.PROJECTS}?category=Video`;
      case "Music & Audio":
        return `${ROUTES.PROJECTS}?category=Music`;
      case "Programming & Tech":
        return `${ROUTES.PROJECTS}?category=Development`;
      case "AI Services":
        return `${ROUTES.PROJECTS}?category=AI`;
      case "Consulting":
      case "Business":
        return `${ROUTES.PROJECTS}?category=Business`;
      case "Browse Freelance by Skill":
        return ROUTES.PROJECTS;
      case "How FreelNova Works":
      case "Customer Success Stories":
      case "Quality Guide":
      case "FreelNova Guides":
        return ROUTES.PRO;
      case "Become a FreelNova Freelancer":
      case "Become an Agency":
        return `${ROUTES.REGISTER}?role=freelancer`;
      case "Community Hub":
      case "Forum":
      case "Events":
        return ROUTES.DASHBOARD;
      case "FreelNova Pro":
        return ROUTES.PRO;
      case "Project Management Service":
      case "Expert Sourcing Service":
      case "AI Store Builder":
        return ROUTES.TALENT_SOLUTIONS;
      case "Logo Maker":
        return ROUTES.PRO;
      default:
        return ROUTES.DASHBOARD;
    }
  };

  const getFooterLinkState = (item) => {
    switch (item) {
      case "About FreelNova":
        return { tab: "about" };
      case "Help Center":
        return { tab: "help" };
      case "Trust & Safety":
        return { tab: "safety" };
      case "Careers":
        return { tab: "careers" };
      case "Terms of Service":
        return { tab: "terms" };
      case "Privacy Policy":
        return { tab: "privacy" };
      case "Expert Sourcing Service":
        return isAuthenticated ? { tab: "sourcing" } : null;
      case "AI Store Builder":
        return isAuthenticated ? { tab: "brief" } : null;
      case "Project Management Service":
        return isAuthenticated ? { tab: "enterprise" } : null;
      default:
        return null;
    }
  };

  useEffect(() => {
    let lastFold = 0;
    let scheduledAnimationFrame = false;

    const updateLaptopFold = () => {
      if (scheduledAnimationFrame) return;
      scheduledAnimationFrame = true;

      requestAnimationFrame(() => {
        scheduledAnimationFrame = false;
        if (!laptopRef.current) return;
        const rect = laptopRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const start = windowHeight * 0.9;
        const end = windowHeight * 0.1;

        const progress = (start - rect.top) / (start - end);
        const nextFold = Math.max(0, Math.min(progress, 1));

        // Only trigger re-render if the state change is meaningful (>= 0.5%)
        if (Math.abs(nextFold - lastFold) >= 0.005) {
          lastFold = nextFold;
          setLaptopFold(nextFold);
        }
      });
    };

    updateLaptopFold();
    window.addEventListener("scroll", updateLaptopFold, { passive: true });
    window.addEventListener("resize", updateLaptopFold, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateLaptopFold);
      window.removeEventListener("resize", updateLaptopFold);
    };
  }, []);

  const screenTilt = -95 + laptopFold * 90;
  const laptopShift = 18 - laptopFold * 14;
  const laptopScale = 0.94 + laptopFold * 0.06;

  return (
    <section className="space-y-10 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.28),transparent_18%),linear-gradient(180deg,#f7fbff_0%,#eef5ff_46%,#f8fbff_100%)] pb-2">
      <style>{`
        @keyframes freelnova-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .freelnova-marquee-track {
          animation: freelnova-marquee 30s linear infinite !important;
          will-change: transform;
          display: flex !important;
          width: max-content !important;
        }
        .freelnova-marquee-track:hover {
          animation-play-state: paused !important;
        }
        @keyframes hero-ambient-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-12px) scale(1.04); opacity: 1; }
        }
        .hero-bg-glow {
          animation: hero-ambient-float 12s ease-in-out infinite;
        }
      `}</style>
      <section className="relative overflow-hidden bg-[#020817] shadow-[0_28px_80px_rgba(15,23,42,0.18)] select-none">
        {/* 1. Deep Navy/Black Base */}
        <div className="absolute inset-0 bg-[#020817]" />

        {/* 2. Right-Side Rich Blue & Cyan Atmospheric Glow */}
        <div className="hero-bg-glow absolute top-0 right-0 h-full w-full bg-[radial-gradient(ellipse_65%_75%_at_80%_35%,rgba(37,99,235,0.42)_0%,rgba(14,165,233,0.22)_35%,rgba(2,8,23,0)_75%)] pointer-events-none" />
        <div className="absolute -top-20 right-0 h-[600px] w-[600px] rounded-full bg-blue-600/28 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[90px] pointer-events-none" />

        {/* 3. Futuristic Tech Particle / Dot Grid (Focused on Right Half) */}
        <div
          className="absolute inset-y-0 right-0 w-2/3 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(96, 165, 250, 0.45) 1.2px, transparent 1.2px)`,
            backgroundSize: `24px 24px`,
            maskImage: `linear-gradient(to right, transparent 0%, black 40%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0%, black 40%)`
          }}
        />

        {/* 4. Faint Abstract Network Grid Lines Overlay */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
            backgroundSize: `72px 72px`
          }}
        />

        {/* 5. Left-Side Dark Shield for 100% Crisp Heading Readability */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020817_0%,#020817_32%,rgba(2,8,23,0.85)_55%,rgba(2,8,23,0.25)_80%,transparent_100%)] pointer-events-none" />

        <div className="relative min-h-0 sm:min-h-[98vh] px-5 py-12 sm:px-6 md:px-10 md:py-16 lg:px-14 lg:py-20">
          <div className="w-full">
            <h1
              className="max-w-3xl text-3xl font-bold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Empowering Skilled Talent, Delivering Proven Results.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:mt-6 md:text-lg md:leading-8">
              Search for services, hire faster, and manage freelance work with a modern marketplace
              experience for students, recruiters, and growing teams.
            </p>
            <div className="mt-8 flex w-full max-w-5xl flex-col gap-3 rounded-[1.75rem] border border-white/15 bg-white/14 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.22)] backdrop-blur-md sm:mt-16 md:mt-24 sm:flex-row">
              <input
                className="w-full flex-1 rounded-[1.25rem] border border-white/10 bg-white/92 px-5 py-4 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-200"
                placeholder="Search for any service..."
                type="text"
              />
              <Link
                className="inline-flex items-center justify-center rounded-[1.25rem] bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-[1.02] shrink-0"
                to={ROUTES.PROJECTS}
              >
                Search
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 md:mt-12 md:gap-4 lg:flex-nowrap">
              <p className="shrink-0 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">Trusted By</p>
              {trustedBy.map((brand) => (
                <span
                  key={brand.name}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-sm shrink-0"
                >
                  <span className="shrink-0 text-white">{brand.icon}</span>
                  <span>{brand.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-10 px-4 sm:px-5 md:px-8 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link
            className="group rounded-[2rem] border border-[#204a88]/80 bg-[#163b70] p-6 text-white shadow-[0_16px_38px_rgba(15,23,42,0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-[#3068b8] hover:bg-[#1a4480] hover:shadow-[0_22px_48px_rgba(22,59,112,0.35)] md:p-7"
            to={`${ROUTES.REGISTER}?role=freelancer`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">I am a Freelancer</p>
            <h2 className="mt-4 text-2xl font-bold text-white">Find paid work</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50/90 font-normal">
              Build your profile, upload your CV, and start applying to recruiter projects.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#163b70] shadow-sm transition-colors group-hover:bg-blue-50">
              Join as Freelancer
            </span>
          </Link>

          <Link
            className="group rounded-[2rem] border border-[#204a88]/80 bg-[#163b70] p-6 text-white shadow-[0_16px_38px_rgba(15,23,42,0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-[#3068b8] hover:bg-[#1a4480] hover:shadow-[0_22px_48px_rgba(22,59,112,0.35)] md:p-7"
            to={`${ROUTES.REGISTER}?role=recruiter`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">I am a Recruiter</p>
            <h2 className="mt-4 text-2xl font-bold text-white">Hire top talent</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50/90 font-normal">
              Post projects, review applicants, and hire vetted freelancers with confidence.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#163b70] shadow-sm transition-colors group-hover:bg-blue-50">
              Join as Recruiter
            </span>
          </Link>

          <Link
            className="group rounded-[2rem] border border-[#204a88]/80 bg-[#163b70] p-6 text-white shadow-[0_16px_38px_rgba(15,23,42,0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-[#3068b8] hover:bg-[#1a4480] hover:shadow-[0_22px_48px_rgba(22,59,112,0.35)] md:p-7"
            to={ROUTES.PRO}
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Need More Support</p>
            <h2 className="mt-4 text-2xl font-bold text-white">Scale with FreelNova Pro</h2>
            <p className="mt-3 text-sm leading-6 text-blue-50/90 font-normal">
              Unlock premium hiring tools, managed sourcing support, and advanced billing options for growing teams.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#163b70] shadow-sm transition-colors group-hover:bg-blue-50">
              Explore Pro Plans
            </span>
          </Link>
        </div>

        <section className="rounded-[2.2rem] border border-slate-900 bg-[#050505] px-6 py-12 shadow-[0_28px_80px_rgba(15,23,42,0.25)] md:py-16 relative overflow-hidden">
          {/* Subtle gradient glowing backgrounds */}
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-7xl relative z-10">
            {/* Split layout: 1 col on mobile, 2 cols on lg screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

              {/* Left Column: The Interactive Folds-on-scroll MacBook */}
              <div className="flex justify-center w-full">
                <div
                  ref={laptopRef}
                  className="relative w-full max-w-3xl [perspective:2200px]"
                  style={{ transform: `translateY(${laptopShift}px) scale(${laptopScale})` }}
                >
                  <div className="absolute left-1/2 top-10 h-24 w-[62%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_68%)] blur-2xl" />
                  <div
                    className="relative mx-auto w-[70%] aspect-[16/10] origin-bottom rounded-[1.8rem] shadow-[0_24px_55px_rgba(0,0,0,0.48)] transition-transform duration-200"
                    style={{
                      transform: `rotateX(${screenTilt}deg)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {laptopFold < 0.75 ? (
                      /* Back Face: Metallic Mac Cover (visible when closed) */
                      <div
                        className="absolute inset-0 rounded-[1.8rem] border border-slate-400 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.35)]"
                        style={{
                          transform: "rotateY(180deg) translateZ(1px)",
                          backgroundImage: "linear-gradient(135deg, #e1e1e6 0%, #b0b0b8 50%, #8a8a92 100%)",
                        }}
                      >
                        <div className="flex flex-col items-center gap-2.5" style={{ transform: "scaleX(-1)" }}>
                          <img
                            src="/favicon.jpg"
                            alt="FreelNova Icon"
                            className="h-9 w-9 rounded-xl shadow-md border border-slate-350"
                          />
                          <div className="flex items-center text-slate-800 font-extrabold text-2xl tracking-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]" style={{ fontFamily: "'Outfit', 'Sora', sans-serif" }}>
                            FreelNova<span className="text-blue-500 font-black">.</span>
                          </div>
                        </div>
                        {/* Subtle Apple-like aluminum line */}
                        <div className="absolute bottom-4 w-[35%] h-0.5 rounded-full bg-black/10" />
                      </div>
                    ) : (
                      /* Front Face: High-end display screen (visible when open) */
                      <div
                        className="absolute inset-0 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,#151515,#090909)] p-2.5 md:p-3.5"
                        style={{
                          transform: "translateZ(1px)",
                        }}
                      >
                        <div className="absolute left-1/2 top-2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-white/10" />
                        <div className="h-full w-full overflow-hidden rounded-[1.35rem] border border-white/8 bg-black">
                          <div className="relative h-full w-full overflow-hidden">
                            <video
                              autoPlay
                              className="h-full w-full object-cover"
                              loop
                              muted
                              playsInline
                              src={heroVideo}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.45))]" />
                            <div className="absolute inset-y-0 left-[-12%] w-[45%] rotate-[12deg] bg-[linear-gradient(90deg,rgba(255,255,255,0.22),rgba(255,255,255,0.02),transparent)] opacity-40" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Keyboard Base Chassis */}
                  <div className="mx-auto -mt-2 w-[70%] rounded-b-[2rem] border border-white/8 bg-[linear-gradient(180deg,#2f2f32,#212124_58%,#29292c)] px-[5.5%] pb-3.5 pt-3 shadow-[0_22px_60px_rgba(0,0,0,0.42)] md:pb-5">
                    {/* MacBook Cylindrical Hinge Connector */}
                    <div className="mx-auto -mt-4 mb-3 h-4.5 w-[84%] rounded-b-md bg-[#0b0b0d] border-t border-black shadow-[inset_0_-1px_1px_rgba(255,255,255,0.08),0_1.5px_2px_rgba(0,0,0,0.5)]" />
                    <div className="rounded-[1.2rem] border border-white/6 bg-[linear-gradient(180deg,#111115,#18181c)] px-2.5 py-3 shadow-[inset_0_-18px_38px_rgba(255,255,255,0.15),inset_0_0_15px_rgba(255,255,255,0.1),0_8px_30px_rgba(255,255,255,0.22)]">
                      {laptopKeyboardRows.map((row) => (
                        <div className="mt-1 flex gap-1 first:mt-0 md:gap-1.5" key={row.join("-")}>
                          {row.map((keyLabel) => {
                            const widthClass =
                              keyLabel === "tab" || keyLabel === "caps"
                                ? "w-[11%]"
                                : keyLabel === "shift"
                                  ? "w-[15%]"
                                  : keyLabel === "space"
                                    ? "w-[34%]"
                                    : keyLabel === "cmd" || keyLabel === "ctrl" || keyLabel === "opt" || keyLabel === "fn"
                                      ? "w-[8.5%]"
                                      : "flex-1";

                            return (
                              <span
                                className={`inline-flex h-[18px] items-center justify-center rounded-[0.4rem] border border-white/25 bg-[linear-gradient(180deg,#16161c,#08080a)] px-1 text-[6.5px] uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_5px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.5)] md:h-[25px] md:text-[8.5px] ${widthClass}`}
                                key={`${row.join("-")}-${keyLabel}`}
                              >
                                {keyLabel === "space" ? "" : keyLabel}
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="mx-auto mt-3 h-14 w-[52%] rounded-[1rem] border border-white/10 bg-transparent shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] md:h-18" />
                    <div className="mx-auto mt-2.5 h-1 w-20 rounded-t bg-black/55 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                  </div>
                </div>
              </div>

              {/* Right Column: Rotating Globe with Title Text */}
              <div className="flex flex-col items-center justify-center text-center w-full">
                <div className="mb-6 max-w-md">
                  <h3 className="text-3xl font-light tracking-tight text-white leading-tight">
                    Worked with hundreds of clients,{" "}
                    <span className="font-normal bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      Worldwide!
                    </span>
                  </h3>
                  <p className="mt-3 text-sm text-slate-400 font-light leading-relaxed">
                    Trusted by businesses across the globe, delivering innovation at scale.
                  </p>
                </div>
                <div className="w-full">
                  <Globe />
                </div>
              </div>

            </div>
          </div>
        </section>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 rounded-[2rem] border border-[#204a88]/80 bg-[#163b70] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-[16px] md:p-8 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Categories</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Explore what you can hire for</h2>
          </div>
          <Link
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-[#0f274f] transition hover:-translate-y-0.5 hover:bg-blue-50 border-0 shadow-sm"
            to={ROUTES.PROJECTS}
          >
            Browse Marketplace
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-5">
            {categoryCards.map((category) => (
              <Link
                to={`${ROUTES.PROJECTS}?category=${encodeURIComponent(category.title)}`}
                className="relative overflow-hidden flex h-[162px] w-[164px] shrink-0 flex-col rounded-[1.6rem] border border-blue-100 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                key={category.title}
              >
                {/* Watermark Background Image */}
                {category.image && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.35] pointer-events-none transition-opacity duration-300 hover:opacity-[0.48]"
                    style={{ backgroundImage: `url("${category.image}")` }}
                  />
                )}
                <div className="relative z-10 flex h-10 items-start">{category.icon}</div>
                <h3 className="relative z-10 mt-6 max-w-[110px] text-[1rem] font-semibold leading-[1.45] text-slate-800">
                  {category.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] md:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Popular Services</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Services teams search for most</h2>
          </div>
        </div>

        <div className="relative mt-7 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white/90 to-transparent" />

          <div className="freelnova-marquee-track flex w-max gap-5 pb-1">
            {[...popularServices, ...popularServices, ...popularServices].map((service, index) => {
              const visual = serviceVisuals[service];
              return (
                <article
                  className="group relative h-60 w-52 shrink-0 cursor-pointer overflow-hidden rounded-[1.75rem] border border-blue-400/30 bg-[#081730] shadow-[0_16px_38px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/70 hover:shadow-[0_28px_56px_rgba(37,99,235,0.3)]"
                  key={`${service}-${index}`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url("${visual.image}")`, backgroundPosition: visual.position }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,23,48,0.2)_0%,rgba(8,23,48,0.5)_40%,rgba(8,23,48,0.92)_100%)] transition-opacity duration-300 group-hover:opacity-90" />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.25),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex h-full flex-col justify-end p-5 text-white">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.01em] text-white drop-shadow-sm">{service}</h3>
                    <p className="mt-1 text-xs font-semibold text-blue-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">Browse →</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 rounded-[2rem] border border-blue-800/80 bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.15)] md:px-10 md:py-10 text-white">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[2.25rem] font-light tracking-[-0.03em] text-white md:text-[3.2rem]">
            Make it all happen with freelancers
          </h2>
          <Link
            className="hidden rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-950 transition hover:bg-blue-50 shadow-sm hover:scale-[1.01] md:inline-flex border-0"
            to={ROUTES.REGISTER}
          >
            Join now
          </Link>
        </div>

        <div className="mt-8 border-t border-white/15" />

        <div className="mt-10 grid gap-10 md:grid-cols-2 xl:grid-cols-4 xl:gap-12">
          {marketplaceBenefits.map((benefit, index) => (
            <div className="flex flex-col items-start" key={benefit}>
              <div className="text-blue-250">{benefitIcons[index]}</div>
              <p className="mt-6 max-w-[250px] text-[1.15rem] leading-[1.35] text-blue-100/90">
                {benefit}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-[16px] md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">The FreelNova Pro Era</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">From idea to delivery, faster</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Launch campaigns, ship websites, create content, and source specialists with a modern
          freelance workflow that feels built for speed.
        </p>

        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5">
          <p className="font-semibold text-blue-500">100% money-back guarantee</p>
          <p className="mt-2 text-sm text-slate-600">
            Start secure hiring with confidence and only move forward when the experience feels right.
          </p>
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12">
        <div className="overflow-hidden rounded-[2rem] border border-blue-800/80 bg-[linear-gradient(135deg,#0a2f72_0%,#0f4fb4_55%,#153b8f_100%)] p-7 text-white shadow-[0_28px_80px_rgba(29,78,216,0.22)] md:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center select-none">
                <span className="text-xl font-medium leading-none tracking-tight flex items-baseline text-white" style={{ fontFamily: "'Sora', 'Outfit', sans-serif" }}>
                  <span className="font-medium text-white">Freel</span>
                  <span className="font-light text-white">Nova</span>
                  <span className="font-light text-white/90 ml-1.5">pro</span>
                  <span className="h-1.5 w-1.5 ml-1 mb-0.5 rounded-full bg-blue-400 shrink-0 inline-block self-baseline" />
                </span>
              </div>
              <h2 className="mt-8 max-w-[560px] text-4xl font-light leading-[1.08] tracking-[-0.04em] text-white md:text-[4rem]">
                Let experts find the right freelancer for you
              </h2>
              <ul className="mt-8 space-y-4 text-lg leading-8 text-white/95">
                <li>Work with experts who will source, interview, and vet freelancers for you</li>
                <li>Get a report with clear recommendations</li>
                <li>Hire vetted freelance talent with confidence</li>
              </ul>
              <Link
                className="mt-10 inline-flex rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
                to={ROUTES.PRO}
              >
                Discover expert sourcing
              </Link>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-4 py-3 text-base font-semibold text-white backdrop-blur-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-white">
                  $
                </span>
                100% money-back guarantee
              </div>
            </div>

            <div className="relative hidden min-h-[460px] lg:block">
              <div className="absolute left-1/2 top-4 z-20 flex h-14 w-32 -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                <span className="mx-2 h-2.5 w-2.5 rounded-full bg-white/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
              </div>
              {sourcingProfiles.map((profile, index) => (
                <div
                  className={`absolute overflow-hidden rounded-[1.9rem] border border-white/12 bg-[#153b8f] shadow-[0_22px_60px_rgba(2,6,23,0.28)] ${profile.className}`}
                  key={profile.image}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url("${profile.image}")` }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,79,180,0.08),rgba(15,79,180,0.12)_40%,rgba(10,47,114,0.78))]" />
                  {index === 1 ? (
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-3xl font-semibold leading-none">Lillian</p>
                      <p className="mt-1 text-lg text-white/85">Website developer</p>
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="absolute bottom-6 right-10 h-20 w-20 rounded-[1.8rem] bg-[linear-gradient(135deg,#9dd7ff,#3b82f6)] shadow-[0_12px_30px_rgba(59,130,246,0.35)] [clip-path:polygon(18%_8%,95%_55%,34%_90%,0_100%,20%_55%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[16px] md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Guides To Help You Grow</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Learn, launch, and scale with confidence</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Link
              to={isAuthenticated ? ROUTES.TALENT_SOLUTIONS : ROUTES.REGISTER}
              state={isAuthenticated ? { tab: "enterprise" } : null}
              className="group block overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/80 hover:shadow-[0_18px_40px_rgba(37,99,235,0.12)]"
              key={guide}
            >
              <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-80 saturate-[0.72] contrast-[0.92] brightness-[0.96] transition-all duration-500 group-hover:opacity-95 group-hover:saturate-90 group-hover:scale-105"
                  style={{ backgroundImage: `url("${guideVisuals[guide]}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent opacity-60" />
              </div>
              <div className="p-5 bg-gradient-to-b from-white to-slate-50/80 border-t border-slate-100">
                <p className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{guide}</p>
                <p className="mt-1 text-xs font-semibold text-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">Read guide →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 sm:mx-5 md:mx-8 lg:mx-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="w-full bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] px-6 py-12 text-center shadow-[0_24px_60px_rgba(15,39,79,0.24)] md:px-10 md:py-16 rounded-b-[2rem]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100/85">Built for modern hiring</p>
          <h2 className="mt-4 text-[2.2rem] font-light leading-[1.08] tracking-[-0.04em] text-white md:text-[4.1rem]">
            Turn ideas into delivery with{" "}
            <span className="inline-flex items-end text-white select-none gap-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
              <span className="font-bold text-white">Freel</span>
              <span className="font-normal text-white -ml-0.5">Nova</span>
              <span className="h-2 w-2 md:h-3.5 md:w-3.5 mb-1.5 md:mb-2.5 rounded-full bg-blue-400 shrink-0" />
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-blue-50/90 md:text-lg">
            Discover trusted freelancers, launch projects faster, and manage every step of the work journey from one streamlined marketplace.
          </p>
          <Link
            className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-blue-950 transition hover:bg-blue-50"
            to={ROUTES.REGISTER}
          >
            Join FreelNova
          </Link>
        </div>

        <div className="mt-8 border-t border-slate-200/80 px-6 py-8 md:px-8 md:py-10">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(footerCatalog).map(([heading, items]) => (
              <div key={heading}>
                <h3 className="text-base font-bold text-slate-900">{heading}</h3>
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li key={item} className="text-sm">
                      <Link
                        to={getFooterLink(item)}
                        state={getFooterLinkState(item)}
                        className="text-slate-600 hover:text-blue-600 hover:underline transition"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

export default Home;

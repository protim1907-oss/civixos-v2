"use client";

import { useRouter } from "next/navigation";
import Sidebar from "../../components/layout/sidebar";

type Representative = {
  name: string;
  image: string;
  email: string;
  linkedin: string;
};

const representatives: Representative[] = [
  {
    name: "Nancy Pelosi",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    email: "nancy@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Kevin McCarthy",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    email: "kevin@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Alexandria Ocasio-Cortez",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    email: "aoc@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Ted Cruz",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    email: "ted@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Kamala Harris",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    email: "kamala@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Bernie Sanders",
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    email: "bernie@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Elizabeth Warren",
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    email: "elizabeth@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Marco Rubio",
    image: "https://randomuser.me/api/portraits/men/8.jpg",
    email: "marco@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Gavin Newsom",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    email: "gavin@example.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Ron DeSantis",
    image: "https://randomuser.me/api/portraits/men/10.jpg",
    email: "ron@example.com",
    linkedin: "https://linkedin.com",
  },
];

export default function MyRepresentativesPage() {
  const router = useRouter();

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">
          My Representatives
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {representatives.map((rep, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow p-4 flex flex-col items-center text-center"
            >
              {/* Image */}
              <img
                src={rep.image}
                alt={rep.name}
                className="w-24 h-24 rounded-full mb-4 object-cover"
              />

              {/* Name */}
              <h2 className="text-lg font-semibold mb-2">
                {rep.name}
              </h2>

              {/* Buttons */}
              <div className="flex flex-col gap-2 w-full mt-2">
                
                {/* ✅ FIXED CHAT BUTTON */}
                <button
                  onClick={() =>
                    router.push(
                      `/chat/${encodeURIComponent(rep.name)}`
                    )
                  }
                  className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Chat with Representative
                </button>

                {/* Email */}
                <a
                  href={`mailto:${rep.email}`}
                  className="bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Send Email
                </a>

                {/* LinkedIn */}
                <a
                  href={rep.linkedin}
                  target="_blank"
                  className="bg-gray-100 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  View LinkedIn
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
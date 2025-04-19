"use client";
import { motion } from "framer-motion";
import { FaUsers } from "react-icons/fa";

const team = [
  {
    name: "Fatimezahra LAMNINI",
    role: "Chef de projet – Domain Manager",
    img: "/avatar.png",
  },
  {
    name: "Hamza GSSIMA",
    role: "Responsable Exploitation Transverse",
    img: "/avatar.png",
  },
  {
    name: "Ayoub LAHDOUD",
    role: "Ingénieur Logiciel Full Stack",
    img: "/avatar.png",
  },
  {
    name: "Ali TOUMZITE",
    role: "Ingénieur Big Data",
    img: "/avatar.png",
  },
];

export default function Team() {
  return (
    <section id="team" className="py-24 px-6 bg-[#f8f9fc]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto text-center"
      >
        <div className="flex justify-center items-center mb-4">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <FaUsers className="text-4xl text-[#004aad]" />
          </motion.div>
        </div>
        <h2 className="text-4xl font-extrabold text-[#004aad] mb-4">L’équipe MyIT</h2>
        <p className="text-gray-600 text-lg mb-12 max-w-2xl mx-auto">
          Un projet porté par des experts engagés et connectés aux besoins des équipes terrain.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {team.map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl shadow-xl hover:shadow-2xl p-6 transition-all duration-300"
            >
              <img
                src={person.img}
                alt={person.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg border-4 border-white"
              />
              <h3 className="text-lg font-bold text-[#004aad] mb-1">{person.name}</h3>
              <p className="text-gray-500 text-sm">{person.role}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

import React from 'react';
import Nav from '../components/Nav';
import Aayush from '../assets/aayush.png';
import Preeti from '../assets/preeti.png';
import Vijayj from '../assets/vijayj.png';
import Raj from '../assets/raj.png';
import Amit from '../assets/amit.jpeg';
import Dinesh from '../assets/dinesh.jpeg';

const teamMembers = [
  {
    name: 'Vijay Jangid',
    role: 'Project Lead & Lead Developer',
    bio: 'Leading the Bio Sentinel project with expertise in environmental monitoring and full-stack development.',
    linkedin: 'https://www.linkedin.com/in/vijay----jangid/',
    image: Vijayj
  },
  {
    name: 'Preeti Yadav',
    role: 'researcher and manager',
    bio: 'Active speaker | Host | Anchor | Event manager',
    linkedin: 'https://www.linkedin.com/in/preeti-yadav-097796301/',
    image: Preeti
  },
  {
    name: 'Aayush Laddha',
    role: 'Full Stack Developer',
    bio: 'React, Node, LangChain | Building AI + IoT Systems | Intern @ Klyro Labs',
    linkedin: 'https://www.linkedin.com/in/imagiwaeve/',
    image: Aayush
  },
  {
    name: 'Raghav Raj',
    role: 'ux researcher and project manager',
    bio: 'CAD || UX/CX Researcher || Project Management || Product Management || NIT Delhi',
    linkedin: 'https://www.linkedin.com/in/raghav-raj-39kumar/',
    image: Raj
  },
  {
    name: 'Amit Kumar Prasad',
    role: '',
    bio: '',
    linkedin: 'https://www.linkedin.com/in/amitkumarprasad1846/',
    image: Amit
  },
  {
    name: 'Dinesh Patel',
    role: '',
    bio: '',
    linkedin: 'https://www.linkedin.com/in/dinesh-patel-35766b2aa/',
    image: Dinesh
  }
];

const Team = () => {
  return (
    <div className="min-h-screen pb-28 font-sans selection:bg-primary/30">
      {/* Header */}
      <div className="flex items-center pt-6 justify-between">
        <div className="flex-1 flex flex-col items-center">
          <h2 className="frosted-text text-lg font-bold tracking-tight">Bio Sentinal</h2>
          <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Our Team</span>
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* Team Intro */}
        <section className="glass-panel rounded-3xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Our Team</h1>
          <p className="text-white/60 text-sm">
            Meet the dedicated professionals behind Bio Sentinel, working together to protect our ecosystems through technology and science.
          </p>
        </section>

        {/* Team Members Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member, index) => (
            <div 
              key={index}
              className="glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.06] transition-all cursor-pointer"
              onClick={() => window.open(member.linkedin, '_blank')}
            >
              <div 
                className="w-16 h-16 rounded-xl bg-slate-800 bg-cover bg-center border border-white/10"
                style={{ backgroundImage: `url('${member.image}')` }}
              ></div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{member.name}</h3>
                <p className="text-[10px] text-primary font-medium uppercase tracking-wider">{member.role}</p>
                <p className="text-[11px] text-white/50 mt-1 line-clamp-2">{member.bio}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-white/40 hover:text-primary transition-colors">
                  open_in_new
                </span>
                <span className="text-[8px] text-white/30 uppercase">LinkedIn</span>
              </div>
            </div>
          ))}
        </section>

        {/* Contact Section */}
        <section className="glass-panel rounded-3xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Join Our Mission</h3>
          <p className="text-white/60 text-sm mb-4">
            Interested in contributing to Bio Sentinel? We're always looking for passionate individuals to join our team.
          </p>
          <a 
            href="mailto:JOPINGVIJAY47@GMAIL.COM"
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">email</span>
            Contact Us
          </a>
        </section>
      </main>

      <Nav />
    </div>
  );
};

export default Team;

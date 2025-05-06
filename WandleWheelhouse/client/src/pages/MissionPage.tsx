// src/pages/MissionPage.tsx
import React from 'react';

const MissionPage: React.FC = () => {
  return (
    // Add max-width and padding for readability on the full page
    <div className="max-w-4xl mx-auto px-4 py-24 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 border-b pb-3">
        Our Mission
      </h1>

      {/* Add your mission content below */}
      <div className="prose prose-lg max-w-none"> {/* Use Tailwind Typography or custom styles */}
         <p className="mb-4">
           Wandle Wheelhouse is dedicated to empowering the Croydon community by providing essential support, fostering connections, and creating opportunities for growth and resilience.
         </p>
         <h2 className="text-2xl font-semibold mt-6 mb-3">What We Do</h2>
         <p className="mb-4">
           We believe in practical action and mutual aid. Our core activities focus on alleviating immediate hardship and building long-term stability for local residents. This includes:
         </p>
         <ul className="list-disc list-inside mb-4 space-y-2">
           <li>Providing emergency food parcels and support with essential supplies.</li>
           <li>Offering free, confidential advice sessions covering housing, benefits, and debt management.</li>
           <li>Running skills workshops (like digital literacy, CV writing, practical crafts) to enhance employment prospects and wellbeing.</li>
           <li>Facilitating community events and groups to reduce isolation and build neighbourly connections.</li>
           <li>Partnering with local organisations and businesses to maximise our impact.</li>
           <li>Championing environmental initiatives, particularly around our local River Wandle.</li>
         </ul>
         <h2 className="text-2xl font-semibold mt-6 mb-3">Our Values</h2>
         <p className="mb-4">
           Compassion, Community, Empowerment, Sustainability, and Integrity guide everything we do. We strive to create a welcoming and supportive environment where everyone feels valued and respected.
         </p>
         <p>
           Learn more about how you can <a href="/get-involved" className="text-blue-600 hover:underline">get involved</a> or <a href="/donate" className="text-blue-600 hover:underline">support our work</a>. {/* Create these pages/links later */}
         </p>
      </div>
      {/* End mission content */}

    </div>
  );
};

export default MissionPage;
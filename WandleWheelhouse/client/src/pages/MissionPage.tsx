import React, { useState } from 'react';
import IntentionForm from '../modals/IntentionFormProps'; // Corrected import path

const MissionPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Full-screen banner with background image */}
      <div
        className="relative w-full h-[80vh] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`, // River Wandle-inspired image
        }}
      >
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <h1 className="relative text-4xl md:text-6xl font-bold text-white text-center z-10">
          Preserving the Heritage of the River Wandle
        </h1>
      </div>

      {/* Main content with max-width 1450px */}
      <div className="max-w-[1400px] mx-auto px-4 py-24">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 border-b pb-3">
            Our Mission
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="mb-4">
              Wandle Heritage Ltd. is dedicated to preserving and sharing the rich industrial and cultural heritage of the River Wandle at The Wheelhouse, Merton Abbey Mills. We aim to educate, engage, and inspire the Merton community through hands-on activities, environmental stewardship, and collaborative partnerships.
            </p>
          </div>

          {/* Large image after mission statement */}
          <div className="mt-14 mb-10 relative">
            <img
              src="https://images.unsplash.com/photo-1745810187217-4d9e1ccfd9d5?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="The Wheelhouse at Merton Abbey Mills"
              className="w-[125%] mx-auto rounded-lg shadow-xl scale-[1.08]"
            />
            <p className="absolute bottom-2 left-0 right-0 text-xs text-white text-center bg-black bg-opacity-50 py-1">
              The historic waterwheel at The Wheelhouse, a centerpiece of Merton’s industrial past.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold mt-6 mb-3">What We Do</h2>
            <p className="mb-4">
              At Wandle Heritage Ltd., we operate The Wheelhouse at Merton Abbey Mills, a historic site along the River Wandle. Our core activities include:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Opening The Wheelhouse every weekend for public access and guided tours for schools, organizations, and community groups.</li>
              <li>Maintaining the historic waterwheel and the surrounding building to preserve Merton’s industrial heritage.</li>
              <li>Monitoring eel migration through our eel pass in collaboration with London Zoo, supporting local biodiversity.</li>
              <li>Clearing the River Wandle of debris to promote a clean and healthy environment.</li>
              <li>Partnering with local organizations, such as Ripple Arts London, to host art and craft workshops and community events.</li>
              <li>Offering volunteering opportunities to engage the community in heritage preservation and environmental initiatives.</li>
            </ul>
          </div>

          {/* Large image after What We Do */}
          <div className="mt-14 mb-10 relative">
            <img
              src="https://images.unsplash.com/photo-1745810187217-4d9e1ccfd9d5?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="River Wandle cleanup"
              className="w-[125%] mx-auto rounded-lg shadow-xl scale-[1.08]"
            />
            <p className="absolute bottom-2 left-0 right-0 text-xs text-white text-center bg-black bg-opacity-50 py-1">
              Volunteers clearing debris from the River Wandle to protect its ecosystem.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold mt-6 mb-3">Our Values</h2>
            <p className="mb-4">
              Heritage, Community, Education, Sustainability, and Collaboration guide our work. We strive to create an inclusive space where everyone can learn about and contribute to the legacy of the River Wandle.
            </p>
            <p>
              Learn more about how you can{' '}
              <a href="/get-involved" className="text-blue-600 hover:underline">
                get involved
              </a>{' '}
              or{' '}
              <a href="/donate" className="text-blue-600 hover:underline">
                support our work
              </a>.
            </p>
          </div>



          {/* Register Button */}
          <div className="mt-12 text-center">
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Register for Tours, Volunteering, Workshops, or Events
            </button>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      {isModalOpen && <IntentionForm isOpen={isModalOpen} onRequestClose={closeModal} />}
    </div>
  );
};

export default MissionPage;
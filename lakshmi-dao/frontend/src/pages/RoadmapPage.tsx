import React from 'react';

interface RoadmapItemProps {
  quarter: string;
  year: string;
  items: string[];
  isCompleted?: boolean;
  isInProgress?: boolean;
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({ quarter, year, items, isCompleted, isInProgress }) => {
  let statusClasses = "border-gray-300 bg-white";
  let statusText = "Planned";
  if (isCompleted) {
    statusClasses = "border-green-500 bg-green-50";
    statusText = "Completed";
  } else if (isInProgress) {
    statusClasses = "border-blue-500 bg-blue-50";
    statusText = "In Progress";
  }

  return (
    <div className={`p-6 rounded-lg shadow-lg border-l-4 ${statusClasses} mb-8`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-2xl font-semibold text-indigo-700">{quarter} {year}</h3>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
          isCompleted ? "bg-green-200 text-green-800" : isInProgress ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-800"
        }`}>
          {statusText}
        </span>
      </div>
      <ul className="list-disc list-inside text-gray-700 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-lg">{item}</li>
        ))}
      </ul>
    </div>
  );
};

const RoadmapPage: React.FC = () => {
  const roadmapData = [
    {
      quarter: "Q3",
      year: "2024",
      items: [
        "Official Whitepaper V1 release detailing core mechanics, governance, and initial tokenomics.",
        "Launch of Lakshmi DAO V1 platform: Donations (ETH & select ZRC20s), Proposal Submissions.",
        "Smart contract audits for core donation and proposal contracts.",
        "Initial community building efforts and social media presence establishment.",
        "Seed funding round completion (if applicable).",
      ],
      isInProgress: true,
    },
    {
      quarter: "Q4",
      year: "2024",
      items: [
        "First round of community voting on submitted charitable proposals.",
        "First disbursement of funds to successfully voted projects.",
        "Launch of LAK token (IDO/IEO, if planned, or initial distribution).",
        "Establishment of basic DAO governance portal for voting.",
        "Partnerships with initial set of charitable organizations.",
      ],
    },
    {
      quarter: "Q1",
      year: "2025",
      items: [
        "Implementation of LAK token staking mechanisms (Phase 1 - basic rewards).",
        "Enhanced governance features: Delegated voting, discussion forums integration.",
        "Development of advanced analytics dashboard for donation and funding transparency.",
        "Expansion of supported ZRC20 tokens for donation.",
        "Security audit of staking and governance contracts.",
      ],
    },
    {
      quarter: "Q2",
      year: "2025",
      items: [
        "Exploration and integration of Layer 2 scaling solutions for reduced gas fees.",
        "Mobile-first DApp improvements for broader accessibility.",
        "Grants program launch for community-led development of DAO tools.",
        "Partnerships with international NGOs and expansion of supported charitable sectors.",
        "First annual DAO impact report publication.",
      ],
    },
    {
        quarter: "Beyond",
        year: "2025+",
        items: [
          "Decentralized identity integration for enhanced reputation and proposal vetting.",
          "Cross-chain governance and interoperability research.",
          "Incubation program for projects funded by Lakshmi DAO.",
          "Development of more sophisticated financial instruments for the treasury (e.g., yield farming for charity).",
          "Continuous improvement of the platform based on community feedback and technological advancements."
        ],
      },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-purple-600">Our Roadmap</h1>
        <p className="text-xl text-gray-600 mt-2">
          Charting the course for Lakshmi DAO's growth and impact.
        </p>
      </header>

      <div className="max-w-3xl mx-auto">
        <p className="text-lg text-gray-700 mb-8 text-center">
          Our roadmap is a living document and may evolve based on community feedback, technological advancements, and strategic opportunities. We are committed to transparency and will keep the community updated on our progress.
        </p>
        {roadmapData.map((data, index) => (
          <RoadmapItem
            key={index}
            quarter={data.quarter}
            year={data.year}
            items={data.items}
            isCompleted={data.isCompleted}
            isInProgress={data.isInProgress}
          />
        ))}
      </div>

      <section className="text-center mt-16">
        <p className="text-xl text-gray-700 mb-6">
          Join us on this journey to revolutionize charitable giving.
        </p>
        <a
          href="/proposals" // Link to proposals or how to get involved
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
        >
          Get Involved
        </a>
      </section>
    </div>
  );
};

export default RoadmapPage;

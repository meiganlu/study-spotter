# StudySpotter

StudySpotter is a study spot finder to help students and others alike to find the best local study spots. This tool is meant to streamline and optimize finding the perfect study spot based on a person's study needs.


## Core Features

* **Search Functionality**: Easily search for local study spots by location
* **Interactive Map**: Navigate study locations using Google Maps integration
* **Study Score**: My rating system evaluates study spots based on various factors


### Study Score Breakdown

The Study Score (rated 1-5) evaluates locations based on:


* Noise level and ambient environment
* Available amenities (WiFi, power outlets)
* Seating capacity and comfort
* Operating hours
* Previous student ratings
* Study-friendly atmosphere


## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Google Maps JavaScript API
* Google Places API


## Getting Started

### Prerequisites
- Make sure to have Google Maps API key ready

### Setup
1. Clone the repository:

```
git clone https://github.com/yourusername/studyspotter.git
```

2. Install dependencies:

```
npm install
```

3. Create `.env.local` and add your Google Maps API key

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

4. Now run the development server!

```
npm run dev
```


### API Key Setup

1. Enable these Google Cloud APIs:

```
Maps JavaScript API
Places API
Geocoding API
```


## Future Features

* Provide more basic filtering options
* Ability to have user login and authentification
* Ability to preview place reviews
* Ability to save study spots
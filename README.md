# StudySpotter

StudySpotter is a study spot finder to help students and others alike to find the best local study spots. This tool is meant to streamline and optimize finding the perfect study spot based on a person's study needs.


## Core Features

* **Search Functionality**: Easily search for local study spots by location
* **Interactive Map**: Navigate study locations using Google Maps integration
* **Convenient Filtering**: Refine search results by rating and category to match user preferences


## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Google Maps JavaScript API
* Google Places API


## Getting Started Locally

### Prerequisites
- Make sure to have Google Maps API key ready

### Setup
1. Clone the repository

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

* Ability to have user login and authentification
* Ability to save study spots


## Visual Overview
![](/images/studyspotter.png)
# China Trains
## Updating for SPARK Submittion:

## Desc.
Project is been a passion of mine recreating a train game I played when I was really young in China that is no longer on the Appstore. Still WIP what to do after trains get to their destinations.

To keep originality everything is written in Chinese first, but has been translated with the latest commit

## Technical quality
Integrated Supabase signin & database with Next.js and CI/CD pipeline with Vercel. Integrated with Github Actions. 

All Trains and assets are done by me in Figma.

Cool features:
Scrollable homescreen horizontally to see the train. Moving animation for pantographs (train power lines) and rail tracks to show train is moving. 

## Features included
- Multiple trainsets possible, pick and choose from departure station
- ability to buy stations by clicking on any city on the map
- send trains between any 2 cities
- Locomotives and train cars differences
- Max weight for certain locomotives
- Different sprites for trains
- Different speeds for moving pantograph / rails to show train speed
- everything is stored in database and validated server-side

## Time spent
Spent 2 hours since last commmit 1 month ago adding in translations

# How to run

## 1. Get your Google Maps API key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
4. Go to **APIs & Services → Credentials**.
5. Click **Create Credentials → API Key**.
6. Copy the generated key.

---

## 2. Get your Supabase project keys
1. Go to [Supabase](https://supabase.com/) and log in.
2. Create a new project or open an existing one.
3. In your project dashboard, go to **Project Settings → API**.
4. Copy the following keys:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon (public) API Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
     ⚠️ *Use the **anon** key, not the service role key, for client-side code.*

---

## 3. Add keys to your environment file
In the root directory of your Next.js project, create a `.env.local` file (if it doesn’t exist) and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# Video demo
https://youtu.be/fJ4wDMVinOw
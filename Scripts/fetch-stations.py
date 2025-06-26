import requests
import json
import time
from pypinyin import lazy_pinyin

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Comprehensive query to get all railway stations and stops in China
OVERPASS_QUERY = """
[out:json][timeout:600];
// Get China's administrative boundary
area["name"="China"]["boundary"="administrative"]->.china;

// Get all railway-related nodes in China
(
  // Railway stations
  node["railway"="station"](area.china);
  node["railway"="halt"](area.china);
  node["railway"="subway_entrance"](area.china);
  node["railway"="tram_stop"](area.china);
  
  // Public transport stations
  node["public_transport"="station"](area.china);
  node["public_transport"="stop_position"]["railway"](area.china);
  
  // Train stations specifically
  node["amenity"="train_station"](area.china);
);

out body;
"""

def fetch_stations_from_overpass():
    """Fetch railway station data from Overpass API"""
    print("Querying Overpass API for train stations in China...")
    
    try:
        response = requests.post(
            OVERPASS_URL, 
            data={"data": OVERPASS_QUERY},
            timeout=900  # 15 minutes timeout
        )
        response.raise_for_status()
        
        data = response.json()
        elements = data.get("elements", [])
        print(f"  → Successfully retrieved {len(elements)} station records")
        return elements
        
    except requests.exceptions.Timeout:
        print("  ✗ Request timed out. Overpass API might be busy.")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Request failed: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"  ✗ Failed to parse JSON response: {e}")
        return []

def generate_pinyin_name(chinese_name):
    """Generate English transliteration using pinyin"""
    if not chinese_name:
        return ""
    
    try:
        pinyin_parts = lazy_pinyin(chinese_name)
        return " ".join(part.capitalize() for part in pinyin_parts)
    except Exception:
        return ""

def classify_station_type(tags):
    """Classify the type of railway station based on tags"""
    railway_type = tags.get("railway", "")
    public_transport = tags.get("public_transport", "")
    amenity = tags.get("amenity", "")
    
    if railway_type == "station" or amenity == "train_station":
        return "railway_station"
    elif railway_type == "halt":
        return "railway_halt"
    elif railway_type == "subway_entrance":
        return "subway_entrance"
    elif railway_type == "tram_stop":
        return "tram_stop"
    elif public_transport == "station":
        return "public_transport_station"
    elif public_transport == "stop_position":
        return "stop_position"
    else:
        return "unknown"

def extract_station_info(element):
    """Extract and format station information from OSM element"""
    tags = element.get("tags", {})
    
    # Get names in different languages
    chinese_name = tags.get("name:zh-CN") or tags.get("name:zh") or tags.get("name", "")
    english_name = tags.get("name:en", "")
    
    # Generate English name if not available
    if not english_name and chinese_name:
        english_name = generate_pinyin_name(chinese_name)
    
    # Extract additional information
    operator = tags.get("operator", "")
    operator_en = tags.get("operator:en", "")
    network = tags.get("network", "")
    station_type = classify_station_type(tags)
    
    # Determine station level/importance
    level = 1  # Default level
    if "高铁" in chinese_name or "高速" in chinese_name:
        level = 3  # High-speed rail
    elif "火车站" in chinese_name or "站" in chinese_name:
        level = 2  # Regular train station
    
    return {
        "id": element.get("id"),
        "name": {
            "chinese": chinese_name,
            "english": english_name,
            "local": tags.get("name:local", "")
        },
        "location": {
            "latitude": element.get("lat"),
            "longitude": element.get("lon")
        },
        "station_info": {
            "type": station_type,
            "level": level,
            "operator": operator,
            "operator_en": operator_en,
            "network": network
        },
        "osm_data": {
            "osm_id": element.get("id"),
            "osm_type": "node",
            "last_updated": tags.get("lastUpdate", "")
        }
    }

def process_stations(elements):
    """Process raw OSM elements into structured station data"""
    print("Processing station data...")
    
    stations = []
    processed_coords = set()  # To avoid duplicates at same location
    
    for element in elements:
        try:
            station_info = extract_station_info(element)
            
            # Skip if we don't have essential information
            if not station_info["name"]["chinese"] and not station_info["name"]["english"]:
                continue
                
            # Create coordinate key to check for duplicates
            coord_key = (
                round(station_info["location"]["latitude"], 6),
                round(station_info["location"]["longitude"], 6)
            )
            
            # Skip if we already have a station at this exact location
            if coord_key in processed_coords:
                continue
                
            processed_coords.add(coord_key)
            stations.append(station_info)
            
        except Exception as e:
            print(f"  ⚠ Error processing station {element.get('id', 'unknown')}: {e}")
            continue
    
    print(f"  → Processed {len(stations)} unique stations")
    return stations

def save_stations_to_json(stations, filename="stations.json"):
    """Save stations data to JSON file"""
    try:
        # Create the final data structure
        output_data = {
            "metadata": {
                "total_stations": len(stations),
                "data_source": "OpenStreetMap via Overpass API",
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "description": "Railway stations and stops in China"
            },
            "stations": stations
        }
        
        with open(filename, "w", encoding="utf-16") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"  → Successfully saved {len(stations)} stations to {filename}")
        return True
        
    except Exception as e:
        print(f"  ✗ Failed to save to {filename}: {e}")
        return False

def main():
    """Main function to orchestrate the station scraping process"""
    print("=" * 60)
    print("🚂 China Train Stations Scraper")
    print("=" * 60)
    
    # Fetch station data
    elements = fetch_stations_from_overpass()
    
    if not elements:
        print("❌ No station data retrieved. Exiting.")
        return
    
    # Process the data
    stations = process_stations(elements)
    
    if not stations:
        print("❌ No valid stations processed. Exiting.")
        return
    
    # Save to JSON file
    success = save_stations_to_json(stations)
    
    if success:
        print("\n✅ Scraping completed successfully!")
        print(f"📊 Total stations saved: {len(stations)}")
        print("📁 Output file: stations.json")
    else:
        print("\n❌ Failed to save data to file.")

if __name__ == "__main__":
    main()

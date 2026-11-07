import { useEffect, useRef, useState } from 'react';
import {
  coordinatesValid, directoryStale, fetchBranchDirectory, nearbyBranches, pilotArea, postalArea, savedPostalKey,
  type Coordinates, type Directory,
} from './lib/nearbyBranches';

export function readSavedArea(): string {
  try { return postalArea(localStorage.getItem(savedPostalKey) || '') || ''; }
  catch { return ''; }
}

export function BranchFinder({ savedArea, onSaveArea }: { savedArea: string; onSaveArea: (value: string) => void }) {
  const [input, setInput] = useState(savedArea);
  const [area, setArea] = useState(savedArea);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState(5);
  const [retailer, setRetailer] = useState('');
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    void fetchBranchDirectory(controller.signal).then(setDirectory).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => { controller.abort(); request.current++; };
  }, [retry]);

  function findPostal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current++;
    setLocating(false);
    const next = postalArea(input);
    if (!next) {
      setLocationError('Enter a valid Canadian postal code, such as M5V 2T6, or its first three characters.');
      return;
    }
    setLocationError('');
    setCoordinates(null);
    setArea(next);
    setInput(next);
    onSaveArea(next);
    try { localStorage.setItem(savedPostalKey, next); } catch { /* Location still works for this visit. */ }
  }

  function findDevice() {
    if (!navigator.geolocation) {
      setLocationError('Device location is unavailable. Enter a postal code to continue.');
      return;
    }
    const id = ++request.current;
    setLocationError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (id !== request.current) return;
      setLocating(false);
      const point: Coordinates = [position.coords.latitude, position.coords.longitude];
      if (coordinatesValid(point)) setCoordinates(point);
      else setLocationError('Device location could not be read. Enter a postal code to continue.');
    }, error => {
      if (id !== request.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? 'Location permission was denied. Enter a postal code to continue.' :
        'Device location could not be found. Enter a postal code to continue.');
    }, { timeout: 9000, maximumAge: 0 });
  }

  const origin = coordinates || directory?.centres[area];
  const supported = origin && pilotArea(origin);
  const results = directory && origin && supported ? nearbyBranches(directory.branches, origin, radius, retailer) : [];
  return <section className="wrap page">
    <span className="overline">TORONTO PILOT</span><h1>Find nearby branches</h1>
    <p>Search a pilot directory of grocery branches in Toronto. Check opening hours with the retailer. Branch price and stock are unverified.</p>
    <div className="panel">
      <form className="inline" onSubmit={findPostal} noValidate>
        <label>Canadian postal code<input value={input} onChange={e => setInput(e.target.value.toUpperCase())}
          maxLength={7} placeholder="M5V 2T6" autoComplete="off" aria-describedby="location-privacy"/></label>
        <button>Find branches</button>
        <button className="secondary" type="button" onClick={findDevice} disabled={locating}>Use my location</button>
      </form>
      <p id="location-privacy">Your browser saves only the first three characters of a postal code. Device coordinates are used on this page and are never saved or sent to PricePine or a geocoder.</p>
      {locating && <p role="status">Looking up device location…</p>}
      {locationError && <p role="alert">{locationError}</p>}
      {loadError && <p role="alert">The branch directory could not load. <button onClick={() => { setLocating(false); setRetry(value => value + 1); }}>Retry</button></p>}
      {!directory && !loadError && <p role="status">Loading the branch directory…</p>}
      {directory && directoryStale(directory.checked) && <p className="notice">The directory was last checked on {directory.checked}. Verify addresses and opening hours before travelling.</p>}
      {directory && (area || coordinates) && !supported && <p role="status">This location is outside the supported Toronto pilot or its postal area could not be located.</p>}
      {directory && supported && <div className="filters">
        <label>Search radius<select value={radius} onChange={e => setRadius(Number(e.target.value))}>{[1, 2, 5, 10, 20].map(km => <option key={km} value={km}>{km} km</option>)}</select></label>
        <label>Retailer<select aria-label="Retailer" value={retailer} onChange={e => setRetailer(e.target.value)}><option value="">All retailers</option>
          {[...new Set(directory.branches.map(branch => branch.retailer))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
      </div>}
    </div>
    {directory && supported && <>
      <p role="status">{results.length ? results.length + (results.length === 1 ? ' branch found.' : ' branches found.') : 'No pilot branches match this radius and retailer.'} Straight-line distances {coordinates ? 'from your device location' : 'from the approximate centre of postal area ' + area}.</p>
      <div className="cards branch-results">{results.map(branch => <article key={branch.id}>
        <h3>{branch.retailer}</h3><p>{branch.address}<br/>{branch.city}, {branch.province} {branch.postal}</p>
        <p>{branch.distance.toFixed(1)} km</p>
        <small>Branch price and stock not verified</small>
        <a href={branch.locator} target="_blank" rel="noreferrer">Official {branch.retailer} locator</a>
      </article>)}</div>
    </>}
    <p><small>Branch addresses adapted from <a href="https://open.toronto.ca/dataset/dinesafe/">Toronto Public Health DineSafe</a>, licensed under the <a href="https://open.toronto.ca/open-data-licence/">Open Government Licence – Toronto</a>. Postal area centres adapted from <a href="https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X">Statistics Canada, 2021 Census Forward Sortation Area Boundary File</a>, under the <a href="https://open.canada.ca/en/open-government-licence-canada">Open Government Licence – Canada</a>. The City of Toronto and Statistics Canada do not endorse PricePine.</small></p>
  </section>;
}

import PhaserGame from '../features/kingdom/PhaserGame'
import DebugOverlay from '../features/debug/DebugOverlay'
import KingdomInteractions from '../features/kingdom/KingdomInteractions'
import {useEffect, useRef, useState} from 'react'
import {getKingdomState, saveKingdomState} from '../services/api.js'
const TIMER_DURATION_SECONDS = 60 * 10

export default function KingdomDashboard() {
	//Store the loaded resources and building names, plus loading and error states
	const [kingdomState, setKingdomState] = useState(null);
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState(null)
	//Changing the retry count runs the loading effect again
	const [retryCount, setRetryCount] = useState(0)

	//Load saved progress when the dashboard opens or the user retries
	useEffect(() => {
		//Allow this request to be cancelled when the effect is cleaned up
		const controller = new AbortController();
		let active = true;

		async function loadKingdom() {
			try {
				const data = await getKingdomState(controller.signal);

				if (active) {
					setKingdomState(data);
				}
			} catch (error) {
				//Store real errors for the UI, but ignore requests we cancelled
				if (active && !controller.signal.aborted) {
					setLoadError(error);
				}
			} finally {
				//Finish loading after either success or failure for the active request
				if (active) {
					setIsLoading(false);
				}
			}
		}

		//Start the async loading function
		loadKingdom();


		return () => {
			active = false;
			controller.abort();
		};
	}, [retryCount]);


	function retryLoading() {
		setIsLoading(true);
		setLoadError(null);
		setKingdomState(null);
		setRetryCount(previous => previous + 1);
	}

	//Show loading instead of starting the game before progress is ready
	if (isLoading) {
		return <p>Your Kingdom is Loading...</p>;
	}

	if (loadError) {
		if (loadError.status === 401) {
			//Keep the same hostname so the login session works with the dashboard
			const signInUrl =
				window.location.protocol + '//' +
				window.location.hostname + ':8002/login';

			return (
				<section>
					<p>Sign in to view your saved kingdom.</p>
					<a href={signInUrl}>Sign in</a>
				</section>
			);
		}

		//Show other request errors and let the user try again
		return (
			<section>
				<p role="alert">
					{loadError.message || 'Could not load the kingdom.'}
				</p>

				<button
					type="button"
					onClick={retryLoading}
				>
					Try again
				</button>
			</section>
		);
	}

	if (!kingdomState) {
		return <p>No Kingdom is Available.</p>;
	}

	return (
		<main className="relative h-dvh w-full overflow-hidden">
			<PhaserGame />
			<KingdomInteractions />
			<DebugOverlay />
			<MyTimer />
		</main>
	)
}

function MyTimer() {
	const [secondsRemaining, setSecondsRemaining] = useState(TIMER_DURATION_SECONDS)
	const [saveError, setSaveError] = useState(null)
	const secondsRemainingRef = useRef(TIMER_DURATION_SECONDS)

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (secondsRemainingRef.current <= 1) {
				secondsRemainingRef.current = TIMER_DURATION_SECONDS
				setSecondsRemaining(TIMER_DURATION_SECONDS)
				getKingdomState()
					.then(latestState => saveKingdomState(latestState))
					.then(() => setSaveError(null))
					.catch(error => {
						setSaveError(
							error instanceof Error ? error.message : 'Could not save kingdom state.'
						)
					})
				return
			}

			secondsRemainingRef.current -= 1
			setSecondsRemaining(secondsRemainingRef.current)
		}, 1000)

		return () => window.clearInterval(intervalId)
	}, [])

	const minutes = Math.floor(secondsRemaining / 60)
	const seconds = String(secondsRemaining % 60).padStart(2, '0')

	// Uncomment this To be able to see the timer In game
	/*return (
		<div className="absolute right-4 top-4 z-50 rounded bg-slate-950/80 px-3 py-2 font-mono text-lg text-white">
			<div role="timer" aria-live="off">
				{minutes}:{seconds}
			</div>
			{saveError && <p role="alert">Save failed: {saveError}</p>}
		</div>
	)
	*/
}

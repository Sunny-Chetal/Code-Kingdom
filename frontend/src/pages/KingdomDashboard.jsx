import PhaserGame from '../features/kingdom/PhaserGame'
import DebugOverlay from '../features/debug/DebugOverlay'
import KingdomInteractions from '../features/kingdom/KingdomInteractions'
import {useState} from "react";
import {useEffect} from "react";
import {getKingdomState} from "../services/api.js";

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
		<main className="h-dvh w-full overflow-hidden">
			<PhaserGame />
			<KingdomInteractions />
			<DebugOverlay />
		</main>
	)
}
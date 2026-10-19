import { CircleAlert, Compass, ListOrdered, LocateFixed, Magnet, MapPin, Navigation, Ruler, Smartphone, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { QiblaCompass } from '@/components/qibla/compass';
import { Button, Spinner } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, FieldError, Input, Select } from '@/components/ui/form';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import {
    angleDifference,
    type City,
    cityLabel,
    compassDirectionLabel,
    type Coordinates,
    distanceToKaabaKm,
    findCity,
    formatCoordinates,
    isFacingQibla,
    isInCountry,
    isValidLatitude,
    isValidLongitude,
    normalizeDegrees,
    qiblaBearing,
    sortedCities,
} from '@/lib/qibla';
import { arabicDigits } from '@/lib/quran';
import { cn, formatNumber } from '@/lib/utils';

interface QiblaProps {
    timezone: string;
    country: string | null;
}

type GeoStatus = 'locating' | 'granted' | 'denied' | 'unavailable' | 'unsupported';
type LocationSource = 'device' | 'city' | 'manual';
type CompassStatus = 'idle' | 'requesting' | 'waiting' | 'listening' | 'denied' | 'unsupported';

/** Without a reading this long after enabling, the device has no compass (a desktop, mostly). */
const SENSOR_TIMEOUT_MS = 3000;

/** How much of each new reading goes into the shown heading: steadies the needle without lagging. */
const SMOOTHING = 0.3;

/**
 * The qibla: the direction of the Kaaba from the user's location, on a compass that turns with the phone.
 */
export default function Qibla({ country }: QiblaProps) {
    const { t } = useTrans();
    const [location, setLocation] = useState<Coordinates | null>(null);
    const [source, setSource] = useState<LocationSource>('device');
    const [cityId, setCityId] = useState<string | null>(null);
    const [geoStatus, setGeoStatus] = useState<GeoStatus>('locating');
    const [heading, setHeading] = useState<number | null>(null);
    const [compassStatus, setCompassStatus] = useState<CompassStatus>('idle');
    const [compassEnabled, setCompassEnabled] = useState(false);
    const smoothedHeading = useRef<number | null>(null);

    const locate = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setGeoStatus('unsupported');

            return;
        }

        setGeoStatus('locating');
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLocation({ lat: coords.latitude, lng: coords.longitude });
                setSource('device');
                setCityId(null);
                setGeoStatus('granted');
            },
            (error) => setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 300_000 },
        );
    }, []);

    useEffect(() => locate(), [locate]);

    useEffect(() => {
        if (!compassEnabled) {
            return;
        }

        const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
        let received = false;
        let frame = 0;
        const timer = window.setTimeout(() => {
            if (!received) {
                setCompassStatus('unsupported');
            }
        }, SENSOR_TIMEOUT_MS);

        const flush = () => {
            frame = 0;
            setHeading(smoothedHeading.current);
        };

        const onOrientation = (event: Event) => {
            const reading = headingFromEvent(event as DeviceOrientationEvent);

            if (reading === null) {
                return;
            }

            if (!received) {
                received = true;
                setCompassStatus('listening');
            }

            const previous = smoothedHeading.current;
            smoothedHeading.current = previous === null ? reading : normalizeDegrees(previous + angleDifference(previous, reading) * SMOOTHING);

            if (!frame) {
                frame = window.requestAnimationFrame(flush);
            }
        };

        window.addEventListener(eventName, onOrientation);

        return () => {
            window.clearTimeout(timer);
            window.cancelAnimationFrame(frame);
            window.removeEventListener(eventName, onOrientation);
        };
    }, [compassEnabled]);

    const enableCompass = () => {
        if (!('DeviceOrientationEvent' in window)) {
            setCompassStatus('unsupported');

            return;
        }

        // iOS asks for permission, and only from a tap: the request must start before any await.
        const { requestPermission } = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };

        if (typeof requestPermission !== 'function') {
            setCompassStatus('waiting');
            setCompassEnabled(true);

            return;
        }

        setCompassStatus('requesting');
        requestPermission
            .call(DeviceOrientationEvent)
            .then((result) => {
                if (result === 'granted') {
                    setCompassStatus('waiting');
                    setCompassEnabled(true);
                } else {
                    setCompassStatus('denied');
                }
            })
            .catch(() => setCompassStatus('denied'));
    };

    const chooseCity = (city: City) => {
        setLocation({ lat: city.lat, lng: city.lng });
        setSource('city');
        setCityId(city.id);
    };

    const enterCoordinates = (coordinates: Coordinates) => {
        setLocation(coordinates);
        setSource('manual');
        setCityId(null);
    };

    const bearing = location ? qiblaBearing(location.lat, location.lng) : null;
    const distance = location ? distanceToKaabaKm(location.lat, location.lng) : null;
    const needsManualLocation = location === null && geoStatus !== 'locating';

    const manualCard = (
        <ManualLocationCard
            location={location}
            cityId={cityId}
            geoStatus={geoStatus}
            country={country}
            prominent={needsManualLocation}
            onCity={chooseCity}
            onCoordinates={enterCoordinates}
            onLocate={locate}
        />
    );

    return (
        <AppLayout title={t('Qibla direction')} description={t('Find the direction of the Kaaba from where you are, with a live compass on your phone.')}>
            <LocationBanner status={geoStatus} onRetry={locate} />

            {needsManualLocation && <div className="mb-6">{manualCard}</div>}

            <div className="grid gap-5 lg:grid-cols-5">
                <CompassCard heading={heading} bearing={bearing} status={compassStatus} locating={geoStatus === 'locating'} onEnable={enableCompass} className="lg:col-span-3" />

                <div className="space-y-4 lg:col-span-2">
                    {location && bearing !== null && distance !== null ? (
                        <LocationStats location={location} bearing={bearing} distance={distance} source={source} cityId={cityId} />
                    ) : (
                        <EmptyStats locating={geoStatus === 'locating'} />
                    )}
                    {!needsManualLocation && manualCard}
                </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <HowToCard />
                <CalibrationCard />
            </div>
        </AppLayout>
    );
}

/**
 * The compass heading from an orientation event: iOS gives it directly, elsewhere it is derived
 * from alpha; both are relative to the top of the device, so a rotated screen is corrected for.
 */
function headingFromEvent(event: DeviceOrientationEvent): number | null {
    const { webkitCompassHeading } = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const screenAngle = window.screen.orientation?.angle ?? 0;

    if (typeof webkitCompassHeading === 'number' && Number.isFinite(webkitCompassHeading)) {
        return normalizeDegrees(webkitCompassHeading + screenAngle);
    }

    if (event.alpha === null) {
        return null;
    }

    return normalizeDegrees(360 - event.alpha + screenAngle);
}

function LocationBanner({ status, onRetry }: { status: GeoStatus; onRetry: () => void }) {
    const { t } = useTrans();

    if (status === 'granted') {
        return null;
    }

    if (status === 'locating') {
        return (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                <Spinner className="size-4" />
                {t('Locating you…')}
            </div>
        );
    }

    const messages: Record<Exclude<GeoStatus, 'granted' | 'locating'>, { icon: LucideIcon; text: string }> = {
        denied: {
            icon: TriangleAlert,
            text: t('Location access was denied. Choose your city or enter your coordinates below, or allow location access in the browser settings and try again.'),
        },
        unavailable: { icon: CircleAlert, text: t('Your location could not be determined right now. Try again or choose your city below.') },
        unsupported: { icon: CircleAlert, text: t('This browser does not support location. Choose your city or enter your coordinates below.') },
    };
    const { icon: Icon, text } = messages[status];

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <Icon className="size-5 shrink-0" />
            <p className="min-w-0 flex-1 leading-relaxed">{text}</p>
            {status !== 'unsupported' && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                    <LocateFixed />
                    {t('Try again')}
                </Button>
            )}
        </div>
    );
}

interface CompassCardProps {
    heading: number | null;
    bearing: number | null;
    status: CompassStatus;
    locating: boolean;
    onEnable: () => void;
    className?: string;
}

function CompassCard({ heading, bearing, status, locating, onEnable, className }: CompassCardProps) {
    const { t, locale } = useTrans();
    const aligned = isFacingQibla(heading, bearing);
    const turn = heading !== null && bearing !== null ? angleDifference(heading, bearing) : null;

    return (
        <Card className={cn('flex flex-col items-center p-5 sm:p-6', className)}>
            <QiblaCompass heading={heading} bearing={bearing} className={cn(locating && 'animate-pulse', bearing === null && 'opacity-60')} />

            <div className="mt-5 flex w-full flex-col items-center gap-3 text-center">
                {bearing === null ? (
                    <p className="text-sm text-muted">{t('The Kaaba marker appears once your location is known.')}</p>
                ) : status === 'listening' && heading !== null ? (
                    <>
                        <p className="text-sm text-muted">
                            {t('Your phone points to')}{' '}
                            <span dir="ltr" className="font-bold text-ink tabular-nums">
                                {formatNumber(Math.round(heading), locale)}°
                            </span>{' '}
                            · {t(compassDirectionLabel(heading))}
                        </p>
                        {turn !== null && !aligned && (
                            <p className="font-semibold text-ink">
                                {turn > 0
                                    ? t('Turn :degrees° to the right', { degrees: formatNumber(Math.round(turn), locale) })
                                    : t('Turn :degrees° to the left', { degrees: formatNumber(Math.round(-turn), locale) })}
                            </p>
                        )}
                    </>
                ) : status === 'idle' || status === 'requesting' ? (
                    <>
                        <Button size="lg" loading={status === 'requesting'} onClick={onEnable}>
                            <Navigation />
                            {t('Enable the compass')}
                        </Button>
                        <p className="text-xs text-muted">{t('Works best on a phone held flat.')}</p>
                    </>
                ) : status === 'waiting' ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                        <Spinner className="size-4" />
                        {t('Waiting for the compass sensor…')}
                    </p>
                ) : (
                    <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-muted sm:flex-row sm:text-start">
                        <Smartphone className="size-5 shrink-0 text-primary-600" />
                        <p className="flex-1">
                            {status === 'denied'
                                ? t('Motion and orientation access was denied. Allow it in the browser settings, then try again.')
                                : t('No compass sensor was found on this device. The dial shows the qibla from true north; open this page on a phone to turn with it live.')}
                        </p>
                        {status === 'denied' && (
                            <Button size="sm" variant="secondary" onClick={onEnable}>
                                {t('Try again')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}

interface LocationStatsProps {
    location: Coordinates;
    bearing: number;
    distance: number;
    source: LocationSource;
    cityId: string | null;
}

function LocationStats({ location, bearing, distance, source, cityId }: LocationStatsProps) {
    const { t, locale } = useTrans();
    const city = findCity(cityId);
    const sourceLabel = source === 'device' ? t('From your device') : source === 'city' && city ? cityLabel(city, locale) : t('Entered manually');

    return (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
                icon={Compass}
                tone="gold"
                label={t('Qibla bearing')}
                value={<span dir="ltr">{formatNumber(Math.round(bearing), locale)}°</span>}
                hint={t('From true north · :direction', { direction: t(compassDirectionLabel(bearing)) })}
            />
            <StatCard
                icon={Ruler}
                tone="emerald"
                label={t('Distance to the Kaaba')}
                value={t(':count km', { count: formatNumber(Math.round(distance), locale) })}
                hint={t("Shortest path over the Earth's surface")}
            />
            <StatCard
                icon={MapPin}
                tone="sky"
                label={t('Your location')}
                value={
                    <span dir="ltr" className="text-xl sm:text-2xl">
                        {formatCoordinates(location)}
                    </span>
                }
                hint={sourceLabel}
            />
        </div>
    );
}

function EmptyStats({ locating }: { locating: boolean }) {
    const { t } = useTrans();

    return (
        <Card className="flex items-start gap-3 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                <Compass className="size-5" />
            </span>
            <div>
                <p className="font-bold text-ink">{locating ? t('Locating you…') : t('No location yet')}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t('The bearing and the distance to the Kaaba appear here once your location is known.')}</p>
            </div>
        </Card>
    );
}

interface ManualLocationCardProps {
    location: Coordinates | null;
    cityId: string | null;
    geoStatus: GeoStatus;
    country: string | null;
    prominent: boolean;
    onCity: (city: City) => void;
    onCoordinates: (coordinates: Coordinates) => void;
    onLocate: () => void;
}

function ManualLocationCard({ location, cityId, geoStatus, country, prominent, onCity, onCoordinates, onLocate }: ManualLocationCardProps) {
    const { t, locale } = useTrans();
    const cityFieldId = useId();
    const latitudeId = useId();
    const longitudeId = useId();
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (location) {
            setLatitude(location.lat.toFixed(4));
            setLongitude(location.lng.toFixed(4));
        }
    }, [location]);

    const { inCountry, others } = useMemo(() => {
        const sorted = sortedCities(locale);
        const inCountry = sorted.filter((city) => isInCountry(city, country));

        return { inCountry, others: inCountry.length > 0 ? sorted.filter((city) => !isInCountry(city, country)) : sorted };
    }, [locale, country]);

    const applyCoordinates = () => {
        const lat = Number.parseFloat(latitude);
        const lng = Number.parseFloat(longitude);

        if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
            setError(t('Enter a latitude between -90 and 90 and a longitude between -180 and 180.'));

            return;
        }

        setError(null);
        onCoordinates({ lat, lng });
    };

    const options = (list: City[]) =>
        list.map((city) => (
            <option key={city.id} value={city.id}>
                {cityLabel(city, locale)}
            </option>
        ));

    return (
        <Card className={cn(prominent && 'border-primary-300 ring-4 ring-primary-500/10 dark:border-primary-500/40')}>
            <CardHeader
                icon={MapPin}
                title={t('Set your location manually')}
                description={t('Choose a city or enter coordinates when the device location is not available.')}
                actions={
                    geoStatus !== 'unsupported' && (
                        <Button size="sm" variant="secondary" loading={geoStatus === 'locating'} onClick={onLocate}>
                            <LocateFixed />
                            {t('Use my device location')}
                        </Button>
                    )
                }
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label={t('City')} htmlFor={cityFieldId} className="sm:col-span-2">
                    <Select
                        id={cityFieldId}
                        value={cityId ?? ''}
                        onChange={(event) => {
                            const city = findCity(event.target.value);

                            if (city) {
                                onCity(city);
                            }
                        }}
                    >
                        <option value="">{t('Choose a city')}</option>
                        {inCountry.length > 0 ? (
                            <>
                                <optgroup label={t('In your country')}>{options(inCountry)}</optgroup>
                                <optgroup label={t('Other cities')}>{options(others)}</optgroup>
                            </>
                        ) : (
                            options(others)
                        )}
                    </Select>
                </Field>
                <Field label={t('Latitude')} htmlFor={latitudeId}>
                    <Input
                        id={latitudeId}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={-90}
                        max={90}
                        dir="ltr"
                        placeholder="30.0444"
                        value={latitude}
                        onChange={(event) => setLatitude(event.target.value)}
                    />
                </Field>
                <Field label={t('Longitude')} htmlFor={longitudeId}>
                    <Input
                        id={longitudeId}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={-180}
                        max={180}
                        dir="ltr"
                        placeholder="31.2357"
                        value={longitude}
                        onChange={(event) => setLongitude(event.target.value)}
                    />
                </Field>
                <div className="sm:col-span-2">
                    <Button onClick={applyCoordinates}>
                        <Navigation />
                        {t('Use these coordinates')}
                    </Button>
                    <FieldError message={error} />
                </div>
            </CardBody>
        </Card>
    );
}

function HowToCard() {
    const { t, locale } = useTrans();
    const steps = [
        t('Allow location access, or choose your city from the list.'),
        t('Tap "Enable the compass" and hold the phone flat, away from metal.'),
        t('Turn until the gold Kaaba marker sits under the mark at the top of the dial.'),
    ];

    return (
        <Card>
            <CardHeader icon={ListOrdered} title={t('How to use it')} />
            <CardBody>
                <ol className="space-y-3">
                    {steps.map((step, index) => (
                        <li key={index} className="flex gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                {locale === 'ar' ? arabicDigits(index + 1) : index + 1}
                            </span>
                            <p className="pt-0.5 leading-relaxed text-ink">{step}</p>
                        </li>
                    ))}
                </ol>
            </CardBody>
        </Card>
    );
}

function CalibrationCard() {
    const { t } = useTrans();
    const notes = [
        t('If the reading drifts, move the phone in a figure-8 a few times to calibrate the sensor.'),
        t('Metal objects, magnets, magnetic phone cases and cars disturb the compass; step away from them.'),
        t('The bearing is measured from true north. A classic compass points to magnetic north, which differs by a few degrees depending on where you are.'),
    ];

    return (
        <Card>
            <CardHeader icon={Magnet} title={t('Calibration and accuracy')} />
            <CardBody>
                <ul className="space-y-3">
                    {notes.map((note, index) => (
                        <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                            {note}
                        </li>
                    ))}
                </ul>
            </CardBody>
        </Card>
    );
}

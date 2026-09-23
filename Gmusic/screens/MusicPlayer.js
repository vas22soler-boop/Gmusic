import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import {
  setAudioModeAsync,
  useAudioPlaylist,
  useAudioPlaylistStatus,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '../components/IconButton';
import songs from '../model/data';
import colors from '../theme/colors';
import formatTime from '../utils/formatTime';

const audioSources = songs.map((song) => song.url);

export default function MusicPlayer() {
  const { height, width } = useWindowDimensions();
  const listRef = useRef(null);

  const playlistOptions = useMemo(
    () => ({
      sources: audioSources,
      loop: 'none',
      updateInterval: 250,
    }),
    [],
  );

  const playlist = useAudioPlaylist(playlistOptions);
  const status = useAudioPlaylistStatus(playlist);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [repeatOne, setRepeatOne] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const currentSong = songs[selectedIndex] ?? songs[0];
  const isFavorite = favoriteIds.has(currentSong.id);
  const isCompact = height < 700;
  const contentWidth = Math.min(Math.max(width - 40, 240), 460);
  const artworkSize = Math.min(
    contentWidth,
    Math.max(isCompact ? 190 : 240, height * (isCompact ? 0.34 : 0.4)),
    420,
  );

  const duration = Number.isFinite(status.duration) ? status.duration : 0;
  const currentTime = Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const displayedPosition = isSeeking ? seekPosition : currentTime;
  const playerUnavailable = !status.isLoaded || status.isBuffering;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    }).catch(() => {
      setErrorMessage('Não foi possível configurar a reprodução de áudio.');
    });
  }, []);

  useEffect(() => {
    playlist.loop = repeatOne ? 'single' : 'none';
  }, [playlist, repeatOne]);

  useEffect(() => {
    if (
      Number.isInteger(status.currentIndex) &&
      status.currentIndex >= 0 &&
      status.currentIndex < songs.length
    ) {
      setSelectedIndex(status.currentIndex);
    }
  }, [status.currentIndex]);

  useEffect(() => {
    listRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: true,
    });
  }, [selectedIndex, width]);

  const reportPlaybackError = useCallback(() => {
    setErrorMessage('Não foi possível executar esta ação no player.');
  }, []);

  const selectSong = useCallback(
    (index) => {
      if (index < 0 || index >= songs.length || index === selectedIndex) {
        return;
      }

      try {
        const shouldResume = status.playing;
        setSelectedIndex(index);
        playlist.skipTo(index);

        if (shouldResume) {
          playlist.play();
        }
      } catch {
        reportPlaybackError();
      }
    },
    [playlist, reportPlaybackError, selectedIndex, status.playing],
  );

  const handleMomentumEnd = useCallback(
    (event) => {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / width);
      selectSong(index);
    },
    [selectSong, width],
  );

  const handlePlayPause = useCallback(() => {
    try {
      if (status.playing) {
        playlist.pause();
      } else {
        playlist.play();
      }
    } catch {
      reportPlaybackError();
    }
  }, [playlist, reportPlaybackError, status.playing]);

  const handleNext = useCallback(() => {
    const nextIndex = (selectedIndex + 1) % songs.length;
    selectSong(nextIndex);
  }, [selectSong, selectedIndex]);

  const handlePrevious = useCallback(async () => {
    try {
      if (currentTime > 3) {
        await playlist.seekTo(0);
        return;
      }

      const previousIndex = (selectedIndex - 1 + songs.length) % songs.length;
      selectSong(previousIndex);
    } catch {
      reportPlaybackError();
    }
  }, [currentTime, playlist, reportPlaybackError, selectSong, selectedIndex]);

  const handleSeekComplete = useCallback(
    async (value) => {
      try {
        await playlist.seekTo(value);
      } catch {
        reportPlaybackError();
      } finally {
        setIsSeeking(false);
      }
    },
    [playlist, reportPlaybackError],
  );

  const toggleFavorite = useCallback(() => {
    setFavoriteIds((currentFavorites) => {
      const updatedFavorites = new Set(currentFavorites);

      if (updatedFavorites.has(currentSong.id)) {
        updatedFavorites.delete(currentSong.id);
      } else {
        updatedFavorites.add(currentSong.id);
      }

      return updatedFavorites;
    });
  }, [currentSong.id]);

  const shareSong = useCallback(async () => {
    try {
      await Share.share({
        message: `${currentSong.title} — ${currentSong.artist}\nOuça no GMusic.`,
        title: currentSong.title,
      });
    } catch {
      setErrorMessage('Não foi possível abrir o compartilhamento.');
    }
  }, [currentSong.artist, currentSong.title]);

  const renderArtwork = useCallback(
    ({ item }) => (
      <View style={[styles.artworkPage, { width }]}>
        <View
          style={[
            styles.artworkGlow,
            {
              width: artworkSize * 0.78,
              height: artworkSize * 0.78,
              borderRadius: artworkSize * 0.39,
            },
          ]}
        />
        <View
          style={[
            styles.artworkFrame,
            {
              width: artworkSize,
              height: artworkSize,
              borderRadius: Math.max(20, artworkSize * 0.07),
            },
          ]}
        >
          <Image
            accessibilityLabel={`Capa da música ${item.title}`}
            resizeMode="cover"
            source={item.artwork}
            style={styles.artwork}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.18)']}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    ),
    [artworkSize, width],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundSoft, colors.background, '#090C10']}
        end={{ x: 0.8, y: 1 }}
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={[styles.header, { paddingHorizontal: Math.max(20, (width - 620) / 2) }]}>
          <View>
            <Text style={styles.eyebrow}>TOCANDO AGORA</Text>
            <Text style={styles.appName}>GMusic</Text>
          </View>

          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {selectedIndex + 1} de {songs.length}
            </Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <FlatList
            data={songs}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            horizontal
            initialNumToRender={2}
            keyExtractor={(item) => String(item.id)}
            onMomentumScrollEnd={handleMomentumEnd}
            pagingEnabled
            ref={listRef}
            renderItem={renderArtwork}
            showsHorizontalScrollIndicator={false}
            style={[styles.carousel, { height: artworkSize + 14 }]}
            windowSize={3}
          />

          <View style={styles.dots}>
            {songs.map((song, index) => (
              <Pressable
                accessibilityLabel={`Ir para a música ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected: index === selectedIndex }}
                hitSlop={7}
                key={song.id}
                onPress={() => selectSong(index)}
                style={[
                  styles.dot,
                  index === selectedIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={[styles.metadata, { width: contentWidth }]}>
            <Text numberOfLines={2} style={styles.songTitle}>
              {currentSong.title}
            </Text>
            <Text numberOfLines={1} style={styles.songArtist}>
              {currentSong.artist}
            </Text>
          </View>

          <View style={[styles.progressSection, { width: contentWidth }]}>
            <Slider
              accessibilityLabel="Posição da música"
              disabled={!status.isLoaded || duration <= 0}
              maximumTrackTintColor="rgba(255, 255, 255, 0.16)"
              maximumValue={Math.max(duration, 1)}
              minimumTrackTintColor={colors.primary}
              minimumValue={0}
              onSlidingComplete={handleSeekComplete}
              onSlidingStart={() => {
                setSeekPosition(currentTime);
                setIsSeeking(true);
              }}
              onValueChange={setSeekPosition}
              step={0.1}
              style={styles.progressBar}
              thumbTintColor={colors.primary}
              value={Math.min(displayedPosition, Math.max(duration, 1))}
            />

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(displayedPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <IconButton
              accessibilityLabel="Música anterior"
              icon="play-skip-back"
              iconSize={27}
              onPress={handlePrevious}
              size={54}
              variant="surface"
            />

            <IconButton
              accessibilityLabel={status.playing ? 'Pausar música' : 'Reproduzir música'}
              disabled={!status.isLoaded}
              icon={status.playing ? 'pause' : 'play'}
              iconSize={38}
              loading={status.isBuffering}
              onPress={handlePlayPause}
              size={78}
              variant="primary"
            />

            <IconButton
              accessibilityLabel="Próxima música"
              icon="play-skip-forward"
              iconSize={27}
              onPress={handleNext}
              size={54}
              variant="surface"
            />
          </View>

          <View style={[styles.statusLine, { opacity: playerUnavailable ? 1 : 0 }]}>
            <Ionicons name="musical-note" size={14} color={colors.textMuted} />
            <Text style={styles.statusText}>
              {status.isBuffering ? 'Carregando áudio...' : 'Preparando player...'}
            </Text>
          </View>

          {errorMessage ? (
            <Pressable
              accessibilityLabel="Fechar aviso"
              accessibilityRole="button"
              onPress={() => setErrorMessage('')}
              style={[styles.errorBanner, { width: contentWidth }]}
            >
              <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          <FooterAction
            active={isFavorite}
            icon={isFavorite ? 'heart' : 'heart-outline'}
            label={isFavorite ? 'Favorita' : 'Favoritar'}
            onPress={toggleFavorite}
          />
          <FooterAction
            active={repeatOne}
            icon="repeat"
            label="Repetir"
            onPress={() => setRepeatOne((currentValue) => !currentValue)}
          />
          <FooterAction
            icon="share-social-outline"
            label="Compartilhar"
            onPress={shareSong}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function FooterAction({ active = false, icon, label, onPress }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerAction,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.footerLabel, active && styles.footerLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  appName: {
    marginTop: 3,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  counterBadge: {
    minWidth: 62,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(255, 211, 105, 0.22)',
    borderWidth: 1,
  },
  counterText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: 4,
    paddingBottom: 6,
  },
  carousel: {
    flexGrow: 0,
  },
  artworkPage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 211, 105, 0.09)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
  },
  artworkFrame: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === 'android' ? 0.38 : 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  dots: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  metadata: {
    alignItems: 'center',
    minHeight: 58,
    paddingHorizontal: 8,
  },
  songTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.45,
  },
  songArtist: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressSection: {
    alignItems: 'stretch',
  },
  progressBar: {
    width: '100%',
    height: 34,
  },
  timeRow: {
    marginTop: -2,
    paddingHorizontal: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  controls: {
    minHeight: 82,
    width: 252,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLine: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  errorBanner: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 122, 122, 0.2)',
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    minHeight: 70,
    paddingHorizontal: 24,
    paddingTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(13, 17, 23, 0.82)',
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  footerAction: {
    minWidth: 88,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  footerLabelActive: {
    color: colors.primary,
  },
});

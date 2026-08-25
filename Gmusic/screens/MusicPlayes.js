import 
{ StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  View,
  useWindowDimensions
   } from 'react-native'
import React, { useState } from 'react'
import{SafeAreaView} from 'react-native-safe-area-context';

import {songs} from '../model/data';
import colors from '../theme/colors';

export default function MusicPlayes() {
  const {width} = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const currentSong = songs[selectedIndex];
  const artWorkSize = Math.min(width - 40,380);

  function handleMomentumEnd(event){
    const offset = event.nativeEvent. contentOffset.x;
    const index = Math.round(offset/ width);
    setSelectedIndex(index);
  }

  function renderArtWork ({ item }) {
    return (
      <View style={[styles.artWorkPage, { width}]}>
        <Image
        source={item.artwork}
        style={[styles.artwork,
        {width: artWorkSize, height: artWorkSize},]}
        />
      </View>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.content}>
            <Text style={styles.eyebrow}>Tocando Agora</Text>
            <Text style={styles.title}>GMusic</Text>
            <Text style={style.description}>Nosso player começa aqui</Text>
        </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({})
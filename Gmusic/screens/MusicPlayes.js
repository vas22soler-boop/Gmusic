import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import{SafeAreaView} from 'react-native-safe-area-context';

import colors from '../theme/colors';

export default function MusicPlayes() {
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
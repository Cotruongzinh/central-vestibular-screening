import { StyleSheet, Text, View } from 'react-native';

export type RequirementEvidenceItem = {
  requirement?: string;
  value: string;
};

type Props = {
  items: readonly RequirementEvidenceItem[];
};

export function RequirementEvidenceStrip({ items }: Props) {
  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {items.map((item, index) => (
        <View key={`${index}-${item.value}`} style={styles.item}>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  item: {
    maxWidth: '100%',
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CFE0E7',
    backgroundColor: '#F5FAFC',
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  value: {
    flexShrink: 1,
    color: '#36596B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
});

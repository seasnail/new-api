package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompletionPricingMetadataMatchesBillingAndResetDefault(t *testing.T) {
	previous := CompletionRatio2JSONString()
	t.Cleanup(func() { require.NoError(t, UpdateCompletionRatioByJSONString(previous)) })
	require.NoError(t, UpdateCompletionRatioByJSONString(`{"gpt-4o":7,"gpt-5":99}`))

	editable := GetCompletionRatioInfo("gpt-4o")
	assert.Equal(t, GetCompletionRatio("gpt-4o"), editable.Ratio)
	assert.Equal(t, 7.0, editable.Ratio)
	assert.False(t, editable.Locked)
	locked := GetCompletionRatioInfo("gpt-5")
	assert.True(t, locked.Locked)
	assert.Equal(t, 8.0, locked.Ratio)
	assert.Equal(t, GetCompletionRatio("gpt-5"), locked.Ratio)

	require.NoError(t, UpdateCompletionRatioByJSONString(`{}`))
	assert.Equal(t, GetCompletionRatio("gpt-4o"), editable.DefaultRatio)
	assert.Equal(t, GetCompletionRatio("gpt-5"), locked.DefaultRatio)
}

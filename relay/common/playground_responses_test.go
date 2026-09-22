package common

import (
	"net/http"
	"net/http/httptest"
	"testing"

	appcommon "github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundMediaKeepsBillingIdentityAndUpstreamPath(t *testing.T) {
	for _, tc := range []struct {
		path    string
		format  types.RelayFormat
		request dto.Request
		mode    int
	}{
		{"/responses", types.RelayFormatOpenAIResponses, &dto.OpenAIResponsesRequest{Model: "gpt-test"}, relayconstant.RelayModeResponses},
		{"/images/generations", types.RelayFormatOpenAIImage, &dto.ImageRequest{Model: "gpt-image-2.5-sunburst"}, relayconstant.RelayModeImagesGenerations},
	} {
		t.Run(tc.path, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/pg"+tc.path, nil)
			c.Set("id", 17)
			appcommon.SetContextKey(c, constant.ContextKeyTokenGroup, "vip")
			appcommon.SetContextKey(c, constant.ContextKeyUsingGroup, "vip")
			info, err := GenRelayInfo(c, tc.format, tc.request, nil)
			require.NoError(t, err)
			assert.True(t, info.IsPlayground)
			assert.Equal(t, 17, info.UserId)
			assert.Equal(t, "vip", info.UsingGroup)
			assert.Equal(t, "/v1"+tc.path, info.RequestURLPath)
			assert.Equal(t, tc.mode, info.RelayMode)
			assert.Equal(t, tc.mode, relayconstant.Path2RelayMode(c.Request.URL.Path))
		})
	}
}

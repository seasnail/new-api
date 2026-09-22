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

func TestPlaygroundResponsesKeepsBillingIdentityAndUpstreamPath(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/pg/responses", nil)
	c.Set("id", 17)
	appcommon.SetContextKey(c, constant.ContextKeyTokenGroup, "vip")
	appcommon.SetContextKey(c, constant.ContextKeyUsingGroup, "vip")
	request := &dto.OpenAIResponsesRequest{Model: "gpt-test"}
	info, err := GenRelayInfo(c, types.RelayFormatOpenAIResponses, request, nil)
	require.NoError(t, err)
	assert.True(t, info.IsPlayground)
	assert.Equal(t, 17, info.UserId)
	assert.Equal(t, "vip", info.UsingGroup)
	assert.Equal(t, "/v1/responses", info.RequestURLPath)
	assert.Equal(t, relayconstant.RelayModeResponses, info.RelayMode)
	assert.Equal(t, relayconstant.RelayModeResponses, relayconstant.Path2RelayMode(c.Request.URL.Path))
}

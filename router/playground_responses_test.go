package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundResponsesRequiresDashboardAuthentication(t *testing.T) {
	require.NoError(t, i18n.Init())
	router := gin.New()
	SetRelayRouter(router)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/pg/responses", strings.NewReader(`{"model":"gpt-test","input":"hello"}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)
	assert.Equal(t, http.StatusUnauthorized, recorder.Code)
}

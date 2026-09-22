package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundMediaPreservesRequestedGroup(t *testing.T) {
	for _, path := range []string{"/pg/responses", "/pg/images/generations"} {
		for _, group := range []string{"", "vip"} {
			t.Run(path+group, func(t *testing.T) {
				body, err := common.Marshal(map[string]any{"model": "gpt-test", "group": group, "input": "hello"})
				require.NoError(t, err)
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				c.Request = httptest.NewRequest(http.MethodPost, path, strings.NewReader(string(body)))
				c.Request.Header.Set("Content-Type", "application/json")
				request, selectChannel, err := getModelRequest(c)
				require.NoError(t, err)
				assert.True(t, selectChannel)
				assert.Equal(t, "gpt-test", request.Model)
				assert.Equal(t, group, request.Group)
				assert.Equal(t, group, common.GetContextKeyString(c, constant.ContextKeyTokenGroup))
			})
		}
	}
}

func TestPlaygroundMediaRejectsUnauthorizedGroupBeforeChannelSelection(t *testing.T) {
	require.NoError(t, i18n.Init())
	saved := setting.UserUsableGroups2JSONString()
	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`))
	t.Cleanup(func() { require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(saved)) })
	for _, path := range []string{"/pg/responses", "/pg/images/generations"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			router := gin.New()
			router.POST(path, func(c *gin.Context) {
				common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
			}, Distribute(), func(c *gin.Context) { t.Error("unauthorized request reached handler") })
			request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"model":"gpt-test","group":"forbidden-playground-group","input":"hello"}`))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(recorder, request)
			assert.Equal(t, http.StatusForbidden, recorder.Code)
		})
	}
}
